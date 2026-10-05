from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path

import httpx
import pymupdf
import pytest

from votoclaro import chunk as chunk_mod
from votoclaro import extract as extract_mod
from votoclaro import verify as verify_mod
from votoclaro.fetch import FetchError, fetch
from votoclaro.models import (
    Afirmacion,
    Analisis,
    AnalisisTema,
    Cita,
    DocumentoRef,
    Generado,
    LecturaFacil,
    Legibilidad,
    Propuesta,
    RedSeguridad,
)
from votoclaro.paths import ROOT, Paths
from votoclaro.registry import (
    load_candidaturas,
    load_sources,
    load_topics,
    write_json,
    write_jsonl,
)
from votoclaro.textnorm import contains_literal, normalize
from votoclaro.validate import validate

# --- textnorm --------------------------------------------------------------------------------


def test_normalize_typography():
    assert normalize("«Hola»  —\n mundo­") == '"Hola" - mundo'
    assert normalize("vivien-\nda pública") == "vivienda pública"
    assert normalize("ﬁscal") == "fiscal"


def test_literal_is_case_and_accent_sensitive():
    assert contains_literal("Ley de Vivienda", "Ley de Vivienda")
    assert not contains_literal("Ley de Vivienda", "ley de vivienda")
    assert not contains_literal("pensión", "pension")


# --- registros reales ------------------------------------------------------------------------


def test_real_registries_are_valid():
    paths = Paths(ROOT / "data")
    cands = load_candidaturas(paths)
    topics = load_topics(paths)
    load_sources(paths)
    assert cands.fase_inclusion == "provisional"
    assert {"pp", "psoe", "vox", "sumar", "podemos"} <= {c.id for c in cands.candidaturas}
    assert cands.get("podemos").convocatorias["generales-2023"].dentro_de == "sumar"
    assert len(topics.temas) == 19


# --- extract + chunk -------------------------------------------------------------------------


def test_extract_pages_sections_language(sample_pdf: Path):
    meta, pages = extract_mod.extract(sample_pdf, "generales-2026", "pp", "x" * 64)
    assert meta.paginas == 3 and meta.idioma == "es" and meta.toc
    assert not extract_mod.needs_ocr(meta)
    secs = {tuple(b.seccion) for p in pages for b in p.bloques}
    assert ("2. Pensiones", "2.1 Pensiones mínimas") in secs


def test_extract_without_toc_uses_font_headings(tmp_path: Path):
    from conftest import build_pdf

    p = tmp_path / "sin_toc.pdf"
    build_pdf(p, with_toc=False)
    _, pages = extract_mod.extract(p, "generales-2026", "pp", "x" * 64)
    titles = [b.texto for pg in pages for b in pg.bloques if b.titulo]
    assert "1. Vivienda" in titles and "3. Sanidad" in titles


def test_chunks_never_cross_pages_and_have_context(sample_pdf: Path, data_dir: Paths):
    cand = load_candidaturas(data_dir).get("pp")
    _, pages = extract_mod.extract(sample_pdf, "generales-2026", "pp", "x" * 64)
    chunks = chunk_mod.make_chunks(pages, cand, "generales-2026")
    assert chunks[0].id == "pp-26-p001-01"
    assert len({c.id for c in chunks}) == len(chunks)
    for c in chunks:
        page_text = pages[c.pagina - 1].texto
        assert all(line in page_text for line in c.texto.splitlines())
        assert c.contexto.startswith("Partido Popular · Generales 29N-2026")
    assert any("Pensiones" in c.contexto for c in chunks if c.pagina == 2)


# --- verify ----------------------------------------------------------------------------------


def _chunks(sample_pdf: Path, data_dir: Paths):
    cand = load_candidaturas(data_dir).get("pp")
    _, pages = extract_mod.extract(sample_pdf, "generales-2026", "pp", "x" * 64)
    return {c.id: c for c in chunk_mod.make_chunks(pages, cand, "generales-2026")}


def test_verify_true_literal_gets_highlight(sample_pdf: Path, data_dir: Paths):
    chunks = _chunks(sample_pdf, data_dir)
    ch = next(c for c in chunks.values() if "200.000 viviendas" in c.texto)
    cita = Cita(
        chunk=ch.id,
        pagina=ch.pagina,
        literal="Construiremos 200.000 viviendas públicas en alquiler asequible antes de 2030",
    )
    with pymupdf.open(sample_pdf) as doc:
        out = verify_mod.apply(cita, ch, doc)
    assert out.verificada and out.resaltada
    assert all(0 <= v <= 1 for r in out.rects for v in r.r)
    assert {r.pagina for r in out.rects} == {1}


def test_verify_rejects_invented_or_altered_literal(sample_pdf: Path, data_dir: Paths):
    chunks = _chunks(sample_pdf, data_dir)
    ch = next(c for c in chunks.values() if "200.000 viviendas" in c.texto)
    with pymupdf.open(sample_pdf) as doc:
        for fake in [
            "Construiremos 300.000 viviendas públicas",  # cifra alterada
            "Bajaremos el IVA de la luz",
        ]:  # inventada
            out = verify_mod.apply(Cita(chunk=ch.id, pagina=ch.pagina, literal=fake), ch, doc)
            assert not out.verificada and not out.rects
        # chunk inexistente
        assert not verify_mod.apply(Cita(chunk="nope", pagina=1, literal="x"), None, doc).verificada


# --- fetch -----------------------------------------------------------------------------------


def test_fetch_local_file_registers_and_is_idempotent(sample_pdf: Path, data_dir: Paths):
    f, res = fetch(
        data_dir,
        "pp",
        "generales-2026",
        "https://www.pp.es/programa.pdf",
        local_file=sample_pdf,
        wayback=False,
    )
    assert res == "nuevo" and f.paginas == 3 and len(f.sha256) == 64
    assert data_dir.document("generales-2026", "pp").exists()
    _, res2 = fetch(
        data_dir,
        "pp",
        "generales-2026",
        "https://www.pp.es/programa.pdf",
        local_file=sample_pdf,
        wayback=False,
    )
    assert res2 == "sin-cambios"


def test_fetch_http_and_rejects_non_pdf(sample_pdf: Path, data_dir: Paths):
    pdf_bytes = sample_pdf.read_bytes()

    def handler(req: httpx.Request) -> httpx.Response:
        if req.url.path.endswith(".pdf"):
            return httpx.Response(200, content=pdf_bytes)
        return httpx.Response(200, content=b"hola, no soy un pdf")

    client = httpx.Client(transport=httpx.MockTransport(handler))
    f, res = fetch(
        data_dir, "psoe", "generales-2026", "https://psoe.es/p.pdf", wayback=False, client=client
    )
    assert res == "nuevo" and f.origen == "pdf"
    with pytest.raises(FetchError):
        fetch(
            data_dir,
            "vox",
            "generales-2026",
            "https://voxespana.es/x",
            wayback=False,
            client=client,
        )


def test_fetch_unknown_candidatura(sample_pdf: Path, data_dir: Paths):
    with pytest.raises(KeyError):
        fetch(data_dir, "inexistente", "generales-2026", "u", local_file=sample_pdf, wayback=False)


# --- validate --------------------------------------------------------------------------------


def _good_analysis(data_dir: Paths, sample_pdf: Path) -> Analisis:
    fetch(
        data_dir,
        "pp",
        "generales-2026",
        "https://www.pp.es/p.pdf",
        local_file=sample_pdf,
        wayback=False,
    )
    chunks = _chunks(sample_pdf, data_dir)
    ch = next(c for c in chunks.values() if "200.000 viviendas" in c.texto)
    lit = "Construiremos 200.000 viviendas públicas en alquiler asequible antes de 2030"
    with pymupdf.open(sample_pdf) as doc:
        cita = verify_mod.apply(Cita(chunk=ch.id, pagina=ch.pagina, literal=lit), ch, doc)
    topics = [t.id for t in load_topics(data_dir).temas]
    vacio = AnalisisTema(menciona=False, red_seguridad=RedSeguridad(ejecutada=True))
    vivienda = AnalisisTema(
        menciona=True,
        resumen=[
            Afirmacion(
                texto="Propone construir 200.000 viviendas públicas de alquiler.", citas=["c0001"]
            )
        ],
        propuestas=[
            Propuesta(
                id="vivienda-1",
                subtema="vivienda pública y social",
                texto="Construir 200.000 viviendas públicas en alquiler antes de 2030.",
                citas=["c0001"],
            )
        ],
        lectura_facil=LecturaFacil(
            resumen=[
                Afirmacion(texto="Quiere hacer 200.000 casas para alquilar.", citas=["c0001"])
            ],
            legibilidad=Legibilidad(inflesz=80, max_palabras_frase=7, ok=True),
            fiel=True,
        ),
    )
    return Analisis(
        convocatoria="generales-2026",
        candidatura="pp",
        documento=DocumentoRef(id="generales-2026/pp", sha256="x", paginas=3, idioma="es"),
        generado=Generado(fecha=datetime.now(UTC), modelo="test", prompt="analisis@1"),
        temas={t: (vivienda if t == "vivienda" else vacio) for t in topics},
        citas={"c0001": cita},
    )


def test_validate_accepts_good_analysis(data_dir: Paths, sample_pdf: Path):
    a = _good_analysis(data_dir, sample_pdf)
    write_json(data_dir.analysis("generales-2026", "pp"), a)
    inf = validate(data_dir)
    assert inf.ok, inf.errores
    assert inf.citas == 1


@pytest.mark.parametrize(
    "breakage", ["unverified", "missing_topic", "too_many", "lf_bad", "no_safety_net"]
)
def test_validate_rejects_broken_analysis(data_dir: Paths, sample_pdf: Path, breakage: str):
    a = _good_analysis(data_dir, sample_pdf)
    if breakage == "unverified":
        a.citas["c0001"].verificada = False
    elif breakage == "missing_topic":
        del a.temas["sanidad"]
    elif breakage == "too_many":
        p = a.temas["vivienda"].propuestas[0]
        a.temas["vivienda"].propuestas = [p.model_copy(update={"id": f"v-{i}"}) for i in range(9)]
    elif breakage == "lf_bad":
        a.temas["vivienda"].lectura_facil.legibilidad.ok = False
    elif breakage == "no_safety_net":
        a.temas["sanidad"].red_seguridad = None
    write_json(data_dir.analysis("generales-2026", "pp"), a)
    assert not validate(data_dir).ok


def test_validate_detects_tampered_document(data_dir: Paths, sample_pdf: Path):
    fetch(
        data_dir,
        "pp",
        "generales-2026",
        "https://www.pp.es/p.pdf",
        local_file=sample_pdf,
        wayback=False,
    )
    data_dir.document("generales-2026", "pp").write_bytes(b"%PDF-1.4 manipulado")
    assert any("hash" in e for e in validate(data_dir).errores)


def test_jsonl_roundtrip(tmp_path: Path, sample_pdf: Path, data_dir: Paths):
    chunks = list(_chunks(sample_pdf, data_dir).values())
    write_jsonl(tmp_path / "c.jsonl", chunks)
    from votoclaro.models import Chunk
    from votoclaro.registry import read_jsonl

    assert read_jsonl(tmp_path / "c.jsonl", Chunk) == chunks
