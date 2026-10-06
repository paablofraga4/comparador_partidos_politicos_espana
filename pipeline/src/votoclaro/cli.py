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
    desde_wayback: Annotated[
        str | None, typer.Option(help="Descargar la copia archivada (timestamp AAAAMMDDhhmmss)")
    ] = None,
    nota: Annotated[str | None, typer.Option(help="Nota sobre la procedencia")] = None,
) -> None:
    """Descarga, archiva y registra un programa (HU-1.1)."""
    try:
        fuente, res = fetch_doc(
            _paths(),
            candidatura,
            convocatoria,
            url,
            archivo,
            force,
            not sin_wayback,
            wayback_ts=desde_wayback,
            nota=nota,
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
            elif cc and cc.programa_propio is False:
                row.append("sin programa propio")
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


@app.command()
def analyze(
    candidatura: Cand,
    convocatoria: Conv,
    tema: Annotated[list[str] | None, typer.Option(help="Solo estos temas (repetible)")] = None,
    force: Annotated[bool, typer.Option(help="Permite rehacer un análisis aprobado")] = False,
    workers: Annotated[int, typer.Option(help="Llamadas en paralelo")] = 6,
) -> None:
    """Analiza el programa por temas con citas verificadas y lectura fácil (HU-1.3/1.4/1.5)."""
    from .analyze import Contexto
    from .analyze import analyze as run_analysis
    from .llm import LLMConfigError, ModelConfig, make_client
    from .registry import load_topics

    paths = _paths()
    target = paths.analysis(convocatoria, candidatura)
    previous = load_analysis(paths, convocatoria, candidatura) if target.exists() else None
    if previous and previous.estado == "aprobado" and not force:
        console.print("[red]✗ El análisis está aprobado. Usa --force (y avisa en el PR).")
        raise typer.Exit(1)
    topics = load_topics(paths).temas
    if tema:
        unknown = set(tema) - {t.id for t in topics}
        if unknown:
            console.print(f"[red]✗ Temas desconocidos: {sorted(unknown)}")
            raise typer.Exit(1)
        topics = [t for t in topics if t.id in tema]
    else:
        previous = None  # análisis completo: se rehace todo
    try:
        client = make_client()
        model, fast = ModelConfig.from_env("ANALYSIS"), ModelConfig.from_env("FAST")
    except LLMConfigError as e:
        console.print(f"[red]✗ {e}")
        raise typer.Exit(1) from e
    fuente = load_sources(paths).convocatorias[convocatoria].programas[candidatura]
    meta_path = paths.meta(convocatoria, candidatura)
    from .models import DocumentoMeta

    meta = DocumentoMeta.model_validate_json(meta_path.read_text(encoding="utf-8"))
    if meta.sha256 != fuente.sha256:
        console.print(
            "[red]✗ El texto extraído no corresponde al documento registrado: `vc extract`"
        )
        raise typer.Exit(1)
    cand = load_candidaturas(paths).get(candidatura)
    with pymupdf.open(paths.data / fuente.fichero) as doc:
        ctx = Contexto(
            client=client,
            model=model,
            fast=fast,
            cand=cand,
            conv=convocatoria,
            meta=meta,
            chunks=load_chunks(paths, convocatoria, candidatura),
            doc=doc,
            log=lambda m: console.print(m),
        )
        console.print(
            f"Analizando {cand.corto} · {convocatoria} · {len(topics)} temas · modelo {model.name}"
        )
        result = run_analysis(ctx, topics, workers=workers, previous=previous)
    write_json(target, result)
    reg = load_sources(paths)
    reg.convocatorias[convocatoria].programas[candidatura].estado = "analizado"
    from .registry import save_sources

    save_sources(paths, reg)
    g = result.generado
    console.print(
        f"[green]✓[/] {paths.rel(target)} · {len(result.citas)} citas · "
        f"{len(result.incidencias)} incidencias · tokens {g.tokens_entrada:,} "
        f"({g.tokens_cache:,} caché) / {g.tokens_salida:,} · "
        f"coste {g.coste_usd if g.coste_usd is not None else '¿?'} USD"
    )


@app.command()
def report(candidatura: Cand, convocatoria: Conv) -> None:
    """Imprime el informe de revisión en Markdown (para el PR)."""
    from .registry import iter_analyses, load_topics
    from .report import render

    paths = _paths()
    a = load_analysis(paths, convocatoria, candidatura)
    peers = [
        x
        for _, x in iter_analyses(paths)
        if x.convocatoria == convocatoria and x.candidatura != candidatura
    ]
    sys.stdout.write(render(a, load_topics(paths), peers) + "\n")


@app.command()
def approve(candidatura: Cand, convocatoria: Conv) -> None:
    """Marca un análisis como aprobado (se hace dentro del PR, antes del merge)."""
    from datetime import UTC, datetime

    from .registry import save_sources
    from .validate import validate as validate_all

    paths = _paths()
    a = load_analysis(paths, convocatoria, candidatura)
    a.estado = "aprobado"
    a.aprobado_en = datetime.now(UTC).replace(microsecond=0)
    write_json(paths.analysis(convocatoria, candidatura), a)
    inf = validate_all(paths)
    if not inf.ok:
        a.estado, a.aprobado_en = "borrador", None
        write_json(paths.analysis(convocatoria, candidatura), a)
        for e in inf.errores[:20]:
            console.print(f"[red]✗ {e}")
        console.print("[red]No se puede aprobar: data/ no es válido.")
        raise typer.Exit(1)
    reg = load_sources(paths)
    reg.convocatorias[convocatoria].programas[candidatura].estado = "aprobado"
    save_sources(paths, reg)
    console.print(f"[green]✓ {candidatura} · {convocatoria} aprobado")


@app.command()
def models() -> None:
    """Lista los modelos disponibles con tu clave (tarea T-107)."""
    from .llm import LLMConfigError, make_client

    try:
        client = make_client()
    except LLMConfigError as e:
        console.print(f"[red]✗ {e}")
        raise typer.Exit(1) from e
    ids = sorted(m.id for m in client.models.list())
    for i in ids:
        console.print(i)


@app.command(name="easy-read")
def easy_read_cmd(
    candidatura: Cand,
    convocatoria: Conv,
    tema: Annotated[list[str] | None, typer.Option(help="Solo estos temas (repetible)")] = None,
    solo_fallidos: Annotated[
        bool, typer.Option("--solo-fallidos", help="Solo temas cuya lectura fácil no valida")
    ] = False,
    workers: Annotated[int, typer.Option(help="Llamadas en paralelo")] = 6,
) -> None:
    """Regenera SOLO la lectura fácil a partir del análisis verificado (no relee el programa)."""
    from concurrent.futures import ThreadPoolExecutor

    from .analyze import LFContexto, easy_read
    from .llm import LLMConfigError, ModelConfig, make_client
    from .registry import load_topics

    paths = _paths()
    a = load_analysis(paths, convocatoria, candidatura)
    if a.estado == "aprobado":
        console.print("[red]✗ El análisis está aprobado; regenerarlo requiere revisión de nuevo.")
        raise typer.Exit(1)
    try:
        ctx = LFContexto(
            client=make_client(),
            model=ModelConfig.from_env("ANALYSIS"),
            fast=ModelConfig.from_env("FAST"),
            cand=load_candidaturas(paths).get(candidatura),
        )
    except LLMConfigError as e:
        console.print(f"[red]✗ {e}")
        raise typer.Exit(1) from e
    temas = {t.id: t for t in load_topics(paths).temas}

    def falla(tid: str) -> bool:
        lf = a.temas[tid].lectura_facil
        return not (lf and lf.legibilidad and lf.legibilidad.ok and lf.fiel is not False)

    objetivo = [
        tid
        for tid, t in a.temas.items()
        if t.menciona and (not tema or tid in tema) and (not solo_fallidos or falla(tid))
    ]
    console.print(f"Regenerando lectura fácil · {candidatura} · {len(objetivo)} temas")

    def run(tid: str):
        return tid, easy_read(ctx, temas[tid], a.temas[tid])

    with ThreadPoolExecutor(max_workers=workers) as pool:
        for tid, lf in pool.map(run, objetivo):
            a.temas[tid] = a.temas[tid].model_copy(update={"lectura_facil": lf})
            ok = lf.legibilidad and lf.legibilidad.ok and lf.fiel is not False
            console.print(
                f"  {'✓' if ok else '✗'} {tid} · INFLESZ "
                f"{lf.legibilidad.inflesz if lf.legibilidad else '?'}"
            )
    hechos = set(objetivo)
    a.incidencias = [
        i for i in a.incidencias if not (i.split(":")[0] in hechos and "lectura fácil" in i)
    ] + ctx.incidencias
    if a.generado.coste_usd is not None and ctx.usage.priced:
        a.generado.coste_usd = round(a.generado.coste_usd + ctx.usage.cost_usd, 4)
    write_json(paths.analysis(convocatoria, candidatura), a)
    console.print(
        f"[green]✓[/] coste de esta pasada: {round(ctx.usage.cost_usd, 4)} USD · "
        f"{len(ctx.incidencias)} temas siguen sin validar"
    )


@app.command(name="vigilar")
def vigilar_cmd(
    convocatoria: Annotated[str, typer.Option("--convocatoria", "-v")] = "generales-2026",
    json_salida: Annotated[
        bool, typer.Option("--json", help="Salida JSON para el workflow")
    ] = False,
    sin_noticias: Annotated[bool, typer.Option("--sin-noticias")] = False,
) -> None:
    """Busca programas nuevos en las webs de las candidaturas y en noticias (HU-1.10)."""
    from .vigilancia import vigilar

    paths = _paths()
    cands = [c for c in load_candidaturas(paths).candidaturas if convocatoria in c.convocatorias]
    novedades, errores = vigilar(
        cands, load_sources(paths), convocatoria, con_noticias=not sin_noticias
    )
    if json_salida:
        sys.stdout.write(
            json.dumps(
                {"novedades": [n.dict() for n in novedades], "errores": errores}, ensure_ascii=False
            )
            + "\n"
        )
        return
    for n in novedades:
        marca = "📄" if n.tipo == "pdf-oficial" else "📰"
        console.print(f"{marca} {n.candidatura} · {n.titulo[:80]} · {n.url}")
    for e in errores:
        console.print(f"[yellow]⚠ {e}")
    console.print(f"{len(novedades)} novedades · {len(errores)} errores")
