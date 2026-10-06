from __future__ import annotations

import shutil
from pathlib import Path

import yaml

from votoclaro.boe import parse
from votoclaro.boe_registro import aplicar
from votoclaro.paths import ROOT, Paths
from votoclaro.registry import load_candidaturas

FIXTURE = Path(__file__).parent / "fixtures" / "boe_candidaturas_2023_extracto.xml"


def _registro_temporal(tmp_path: Path) -> Paths:
    d = tmp_path / "data"
    d.mkdir()
    shutil.copy(ROOT / "data" / "candidaturas.yaml", d / "candidaturas.yaml")
    return Paths(d)


def test_aplicar_presentadas_y_proclamadas(tmp_path: Path):
    p = _registro_temporal(tmp_path)
    doc = parse(FIXTURE.read_text(encoding="utf-8"))
    res = aplicar(doc, "presentadas", p.candidaturas, p.data / "circunscripciones.yaml")

    reg = load_candidaturas(p)  # sigue siendo válido
    assert reg.fase_inclusion == "presentadas"
    psoe = reg.get("psoe").convocatorias["generales-2026"]
    assert psoe.estado == "presentada"
    assert psoe.listas["barcelona"] == "PSC" and psoe.listas["bizkaia"] == "PSE-EE (PSOE)"
    assert set(psoe.circunscripciones) == {"albacete", "barcelona", "bizkaia", "navarra"}
    assert "pacma" in res.nuevas and reg.get("pacma").color == "#8A8F9A"
    assert reg.get("pacma").convocatorias["generales-2026"].estado == "presentada"
    # Se conservan los comentarios del registro
    assert "# Registro de CANDIDATURAS" in p.candidaturas.read_text(encoding="utf-8")
    circ = yaml.safe_load((p.data / "circunscripciones.yaml").read_text(encoding="utf-8"))
    assert [c["id"] for c in circ["circunscripciones"]] == [
        "albacete",
        "barcelona",
        "bizkaia",
        "navarra",
    ]

    # Proclamación sin PACMA en el documento → PACMA queda «no-proclamada»
    xml_sin_pacma = FIXTURE.read_text(encoding="utf-8").replace(
        "PARTIDO ANIMALISTA CON EL MEDIO AMBIENTE (PACMA)", "OTRO TEXTO SIN SIGLAS"
    )
    res2 = aplicar(
        parse(xml_sin_pacma), "proclamadas", p.candidaturas, p.data / "circunscripciones.yaml"
    )
    reg2 = load_candidaturas(p)
    assert reg2.fase_inclusion == "proclamadas"
    assert "pacma" in res2.no_proclamadas
    assert reg2.get("pacma").convocatorias["generales-2026"].estado == "no-proclamada"
    assert reg2.get("pp").convocatorias["generales-2026"].estado == "proclamada"
    # No duplica altas en la segunda pasada
    ids = [c.id for c in reg2.candidaturas]
    assert len(ids) == len(set(ids))
