"""Tests del análisis con un cliente OpenAI simulado (sin red ni coste)."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from types import SimpleNamespace

import pymupdf
import pytest

from votoclaro import chunk as chunk_mod
from votoclaro import extract as extract_mod
from votoclaro import legibility
from votoclaro.analyze import CitaLLM, Contexto, SalidaLF, Veredicto, analyze, snap_literal
from votoclaro.llm import ModelConfig
from votoclaro.paths import Paths
from votoclaro.registry import load_candidaturas, load_topics
from votoclaro.validate import _check_analysis


def _text(m: dict) -> str:
    c = m["content"]
    return c if isinstance(c, str) else "".join(b["text"] for b in c)


LIT_VIV = "Construiremos 200.000 viviendas públicas en alquiler asequible antes de 2030"
LIT_PEN = "Garantizaremos la revalorización de las pensiones conforme al IPC"


@dataclass
class FakeResponses:
    """Responde según el esquema pedido y el tema del último mensaje del usuario."""

    chunks: dict[str, str]
    calls: list[dict]
    invent_first: bool = False

    def _chunk_with(self, text: str) -> str:
        return next(cid for cid, t in self.chunks.items() if text.split()[0] in t)

    def parse(self, **kw):
        self.calls.append(kw)
        schema = kw["text_format"]
        usage = SimpleNamespace(
            input_tokens=1000,
            output_tokens=100,
            input_tokens_details=SimpleNamespace(cached_tokens=800),
        )
        if schema is SalidaLF:
            out = SalidaLF(
                resumen=[{"texto": "Quiere hacer más casas para alquilar.", "origen": [0]}],
                propuestas=[
                    {"texto": "Hacer 200.000 casas para alquilar.", "origen": "vivienda-1"}
                ],
            )
        elif schema is Veredicto:
            out = Veredicto(problemas=[])
        else:
            if kw.get("prompt_cache_options", {}).get("prewarm"):
                return SimpleNamespace(output_parsed=None, usage=usage, status="completed")
            prompt = "\n".join(_text(m) for m in kw["input"] if m["role"] == "user")
            tema_line = next(line for line in prompt.splitlines() if line.startswith("TEMA:"))
            retry = any(m["role"] == "assistant" for m in kw["input"])
            if "(id: vivienda)" in tema_line:
                lit = LIT_VIV
                if self.invent_first and not retry:
                    lit = "Construiremos 900.000 viviendas"  # inventada → debe reintentar
                cid = self._chunk_with("Construiremos")
                cita = {"chunk_id": cid, "literal": lit, "traduccion": None}
                out = schema.model_validate(
                    {
                        "menciona": True,
                        "resumen": [
                            {
                                "texto": "Propone ampliar la vivienda pública en alquiler.",
                                "citas": [cita],
                            }
                        ],
                        "propuestas": [
                            {
                                "texto": "Construir 200.000 viviendas públicas de alquiler.",
                                "subtema": "vivienda pública y social",
                                "citas": [cita],
                            }
                        ],
                    }
                )
            elif "(id: pensiones)" in tema_line and "ATENCIÓN" in prompt:
                # Solo la red de seguridad «encuentra» las pensiones
                cid = self._chunk_with("Garantizaremos")
                cita = {"chunk_id": cid, "literal": LIT_PEN, "traduccion": None}
                out = schema.model_validate(
                    {
                        "menciona": True,
                        "resumen": [
                            {
                                "texto": "Propone revalorizar las pensiones con el IPC.",
                                "citas": [cita],
                            }
                        ],
                        "propuestas": [
                            {
                                "texto": "Revalorizar las pensiones conforme al IPC.",
                                "subtema": "revalorización",
                                "citas": [cita],
                            }
                        ],
                    }
                )
            else:
                out = schema.model_validate({"menciona": False, "resumen": [], "propuestas": []})
        return SimpleNamespace(output_parsed=out, usage=usage, status="completed")


def _ctx(sample_pdf: Path, data_dir: Paths, invent_first=False):
    cand = load_candidaturas(data_dir).get("pp")
    meta, pages = extract_mod.extract(sample_pdf, "generales-2026", "pp", "x" * 64)
    chunks = chunk_mod.make_chunks(pages, cand, "generales-2026")
    calls: list[dict] = []
    fake = SimpleNamespace(
        responses=FakeResponses({c.id: c.texto for c in chunks}, calls, invent_first)
    )
    cfg = ModelConfig(name="fake-model", price_in=2.0, price_cached=0.2, price_out=8.0)
    doc = pymupdf.open(sample_pdf)
    ctx = Contexto(
        client=fake,
        model=cfg,
        fast=cfg,
        cand=cand,
        conv="generales-2026",
        meta=meta,
        chunks=chunks,
        doc=doc,
        log=lambda m: None,
    )
    return ctx, calls, doc


def test_analyze_end_to_end_valid(sample_pdf: Path, data_dir: Paths):
    ctx, calls, doc = _ctx(sample_pdf, data_dir)
    temas = load_topics(data_dir).temas
    a = analyze(ctx, temas, workers=4)
    doc.close()
    assert set(a.temas) == {t.id for t in temas}
    viv = a.temas["vivienda"]
    assert viv.menciona and viv.propuestas[0].id == "vivienda-1"
    assert all(c.verificada for c in a.citas.values())
    # La red de seguridad rescata pensiones y deja constancia
    pen = a.temas["pensiones"]
    assert pen.menciona and pen.red_seguridad and pen.red_seguridad.reanalizado
    # Los temas sin contenido llevan la red de seguridad ejecutada
    assert a.temas["sanidad"].red_seguridad.ejecutada
    # Lectura fácil hereda citas de la versión normal
    assert set(viv.lectura_facil.propuestas[0].citas) <= set(viv.propuestas[0].citas)
    # El documento va primero (prefijo idéntico → caché) con la misma clave de caché
    analysis_calls = [c for c in calls if c["text_format"].__name__ == "TemaLLM"]
    first_msgs = {_text(c["input"][0]) for c in analysis_calls}
    assert len(first_msgs) == 1 and first_msgs.pop().startswith("DOCUMENTO · Partido Popular")
    # Punto de corte explícito tras el documento + modo explícito + prewarm previo
    assert all(
        c["input"][0]["content"][0]["prompt_cache_breakpoint"] == {"mode": "explicit"}
        for c in analysis_calls
    )
    assert all(c["prompt_cache_options"]["mode"] == "explicit" for c in analysis_calls)
    assert analysis_calls[0]["prompt_cache_options"].get("prewarm") is True
    assert {c.get("prompt_cache_key") for c in analysis_calls} == {"votoclaro/generales-2026/pp"}
    assert a.generado.tokens_cache > 0 and a.generado.coste_usd and a.generado.coste_usd > 0
    # Pasa la misma validación que la CI
    from votoclaro.validate import Informe

    inf = Informe()
    _check_analysis("pp", a, {t.id for t in temas}, inf)
    assert inf.ok, inf.errores


def test_invented_quote_triggers_retry_and_is_fixed(sample_pdf: Path, data_dir: Paths):
    ctx, calls, doc = _ctx(sample_pdf, data_dir, invent_first=True)
    viv = next(t for t in load_topics(data_dir).temas if t.id == "vivienda")
    a = analyze(ctx, [viv], workers=1)
    doc.close()
    retries = [c for c in calls if any(m["role"] == "assistant" for m in c["input"])]
    assert retries, "debió reintentar al no verificarse la cita inventada"
    assert "no aparece tal cual" in retries[0]["input"][-1]["content"]
    assert a.temas["vivienda"].menciona
    assert all("900.000" not in c.literal for c in a.citas.values())


def test_register_rejects_unknown_chunk(sample_pdf: Path, data_dir: Paths):
    ctx, _, doc = _ctx(sample_pdf, data_dir)
    cid, err = ctx.register(CitaLLM(chunk_id="no-existe", literal=LIT_VIV, traduccion=None))
    doc.close()
    assert cid is None and "no existe" in err


# --- legibilidad -----------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("word", "n"),
    [
        ("casa", 2),
        ("pensión", 2),
        ("país", 2),
        ("leer", 2),
        ("ciudad", 2),
        ("vivienda", 3),
        ("ley", 1),
        ("hoy", 1),
    ],
)
def test_syllables(word: str, n: int):
    assert legibility.count_syllables(word) == n


def test_legibility_easy_text_passes_and_hard_fails():
    easy = [
        "El partido quiere hacer más casas.",
        "Las casas serán para alquilar.",
        "Los jóvenes podrán vivir en ellas.",
    ]
    assert legibility.check(easy).ok
    hard = [
        "La implementación de mecanismos de corresponsabilidad interadministrativa "
        "garantizará la sostenibilidad presupuestaria de las prestaciones contributivas "
        "en el horizonte temporal de la próxima década según el CPFF."
    ]
    res = legibility.check(hard)
    assert not res.ok
    assert any("palabras" in a for a in res.avisos) and any("CPFF" in a for a in res.avisos)


def test_snap_literal_joins_hyphenation_and_completes_words():
    chunk = (
        "Derogación de la Ley de Vivienda y respeto a las competencias de la Co-\nmunidad Foral."
    )
    assert snap_literal("respeto a las competencias de la Co- munidad", chunk).endswith("Comunidad")
    assert (
        snap_literal("Derogación de la Ley de Vivien", chunk) == "Derogación de la Ley de Vivienda"
    )
    assert snap_literal("texto que no está", chunk) == "texto que no está"


def test_single_schema_keeps_cache_prefix(sample_pdf: Path, data_dir: Paths):
    ctx, calls, doc = _ctx(sample_pdf, data_dir)
    temas = load_topics(data_dir).temas[:4]
    analyze(ctx, temas, workers=2)
    doc.close()
    schemas = {c["text_format"] for c in calls if c["text_format"].__name__ == "TemaLLM"}
    assert len(schemas) == 1, "el esquema debe ser idéntico en todos los temas (caché)"
