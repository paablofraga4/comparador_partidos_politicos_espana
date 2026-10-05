"""CLI `vc` del pipeline de VotoClaro."""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Annotated

import pymupdf
import typer
from rich.console import Console
from rich.table import Table

from . import chunk as chunk_mod
from . import extract as extract_mod
from . import verify as verify_mod
from .fetch import FetchError
from .fetch import fetch as fetch_doc
from .models import Analisis
from .paths import Paths
from .registry import (
    load_analysis,
    load_candidaturas,
    load_chunks,
    load_pages,
    load_sources,
    write_json,
    write_jsonl,
)
from .validate import validate as validate_data

# Consolas de Windows en cp1252: forzar UTF-8 para tildes, «», → y ✓.
for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        _stream.reconfigure(encoding="utf-8", errors="replace")

app = typer.Typer(
    help="Pipeline de VotoClaro: programas electorales → análisis con citas verificadas.",
    no_args_is_help=True,
)
console = Console()

Cand = Annotated[str, typer.Option("--candidatura", "-c", help="id en data/candidaturas.yaml")]
Conv = Annotated[str, typer.Option("--convocatoria", "-v", help="generales-2023 | generales-2026")]


def _paths() -> Paths:
    return Paths.default()


@app.command()
def fetch(
    candidatura: Cand,
    convocatoria: Conv,
    url: Annotated[str, typer.Option(help="URL oficial del programa (PDF o web)")],
    archivo: Annotated[
        Path | None, typer.Option(help="PDF ya descargado (si la web bloquea descargas)")
    ] = None,
    force: Annotated[
        bool, typer.Option(help="Re-registrar aunque el aprobado sea distinto")
    ] = False,
    sin_wayback: Annotated[bool, typer.Option("--sin-wayback")] = False,
) -> None:
    """Descarga, archiva y registra un programa (HU-1.1)."""
    try:
        fuente, res = fetch_doc(
            _paths(), candidatura, convocatoria, url, archivo, force, not sin_wayback
        )
    except FetchError as e:
        console.print(f"[red]✗ {e}")
        raise typer.Exit(1) from e
    console.print(
        f"[green]✓ {res}[/] {fuente.fichero} · {fuente.paginas} págs · {fuente.sha256[:12]}"
        f" · archivo: {fuente.url_archivo or '—'}"
    )


@app.command()
def extract(candidatura: Cand, convocatoria: Conv) -> None:
    """Extrae texto, posiciones y secciones por página (HU-1.2) y genera los chunks."""
    paths = _paths()
    fuente = load_sources(paths).convocatorias[convocatoria].programas.get(candidatura)
    if not fuente:
        console.print(f"[red]✗ {candidatura}/{convocatoria} no está registrado: ejecuta `vc fetch`")
        raise typer.Exit(1)
    meta, pages = extract_mod.extract(
        paths.data / fuente.fichero, convocatoria, candidatura, fuente.sha256
    )
    if extract_mod.needs_ocr(meta):
        console.print(
            "[yellow]⚠ El documento parece escaneado (poco texto). Hace falta OCR: "
            "`ocrmypdf` sobre el PDF y volver a ejecutar `vc fetch --archivo`."
        )
        raise typer.Exit(2)
    write_json(paths.meta(convocatoria, candidatura), meta)
    write_jsonl(paths.pages(convocatoria, candidatura), pages)
    cand = load_candidaturas(paths).get(candidatura)
    chunks = chunk_mod.make_chunks(pages, cand, convocatoria)
    write_jsonl(paths.chunks(convocatoria, candidatura), chunks)
    secciones = len({tuple(c.seccion) for c in chunks if c.seccion})
    console.print(
        f"[green]✓[/] {meta.paginas} págs · idioma {meta.idioma} · {len(chunks)} chunks · "
        f"{secciones} secciones · índice PDF: {'sí' if meta.toc else 'no'}"
    )


@app.command()
def verify(candidatura: Cand, convocatoria: Conv) -> None:
    """Re-verifica todas las citas de un análisis y recalcula los resaltados (HU-1.5)."""
    paths = _paths()
    a = load_analysis(paths, convocatoria, candidatura)
    chunks = {c.id: c for c in load_chunks(paths, convocatoria, candidatura)}
    fuente = load_sources(paths).convocatorias[convocatoria].programas[candidatura]
    with pymupdf.open(paths.data / fuente.fichero) as doc:
        a.citas = {cid: verify_mod.apply(c, chunks.get(c.chunk), doc) for cid, c in a.citas.items()}
    write_json(paths.analysis(convocatoria, candidatura), a)
    total = len(a.citas)
    ok = sum(c.verificada for c in a.citas.values())
    hl = sum(c.resaltada for c in a.citas.values())
    color = "green" if ok == total else "red"
    console.print(f"[{color}]{ok}/{total} citas verificadas[/] · {hl}/{total} con resaltado")
    if ok != total:
        raise typer.Exit(1)


@app.command()
def validate() -> None:
    """Valida todo data/ (lo ejecuta la CI y el hook Stop)."""
    inf = validate_data(_paths())
    for w in inf.avisos[:20]:
        console.print(f"[yellow]⚠ {w}")
    if len(inf.avisos) > 20:
        console.print(f"[yellow]… y {len(inf.avisos) - 20} avisos más")
    for e in inf.errores:
        console.print(f"[red]✗ {e}")
    console.print(
        f"{inf.analisis} análisis · {inf.citas} citas · "
        f"{len(inf.errores)} errores · {len(inf.avisos)} avisos"
    )
    if not inf.ok:
        raise typer.Exit(1)
    console.print("[green]✓ data/ válido")


@app.command()
def status() -> None:
    """Estado de cada candidatura por convocatoria."""
    paths = _paths()
    cands = load_candidaturas(paths)
    sources = load_sources(paths)
    t = Table(title=f"Candidaturas · fase de inclusión: {cands.fase_inclusion}")
    t.add_column("Candidatura")
    for conv in sources.convocatorias:
        t.add_column(conv)
    for c in sorted(cands.candidaturas, key=lambda c: c.corto.lower()):
        row = [c.corto]
        for conv, cf in sources.convocatorias.items():
            cc = c.convocatorias.get(conv)
            f = cf.programas.get(c.id)
            if f:
                state = f.estado
                if paths.analysis(conv, c.id).exists():
                    state = load_analysis(paths, conv, c.id).estado
                row.append(state)
            elif cc and cc.dentro_de:
                row.append(f"dentro de {cc.dentro_de}")
            elif cc and cc.programa_propio == "por-verificar":
                row.append("¿programa propio?")
            else:
                row.append("pendiente")
        t.add_row(*row)
    console.print(t)


@app.command()
def schema(
    salida: Annotated[Path, typer.Option(help="Fichero de salida")] = Path(
        "../web/lib/schema/analisis.schema.json"
    ),
) -> None:
    """Exporta el JSON Schema de `Analisis` para generar los tipos de la web."""
    salida.parent.mkdir(parents=True, exist_ok=True)
    salida.write_text(
        json.dumps(Analisis.model_json_schema(), ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    console.print(f"[green]✓[/] {salida}")


@app.command(name="pages")
def show_pages(candidatura: Cand, convocatoria: Conv, pagina: int) -> None:
    """Muestra el texto extraído de una página (útil para revisar)."""
    for p in load_pages(_paths(), convocatoria, candidatura):
        if p.pagina == pagina:
            console.print(p.texto)
            return
    console.print("[red]Página no encontrada")
    raise typer.Exit(1)
