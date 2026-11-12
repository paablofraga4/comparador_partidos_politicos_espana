"""Candado de coste (spec 008): solo las candidaturas principales se analizan con IA."""

from __future__ import annotations

from typer.testing import CliRunner

from votoclaro.cli import app
from votoclaro.paths import ROOT, Paths
from votoclaro.registry import load_candidaturas


def test_principales_como_en_la_web():
    reg = load_candidaturas(Paths(ROOT / "data"))
    assert reg.es_principal("pp")  # representación en la XV legislatura
    assert reg.es_principal("fa")  # sucesora de Sumar
    assert reg.es_principal("eh-bildu-erc")  # lista conjunta con EH Bildu y ERC
    assert not reg.es_principal("pacma")


def test_analyze_se_niega_con_una_no_principal_antes_de_llamar_a_la_ia(monkeypatch):
    # Sin clave: si el candado no parase antes, fallaría por la configuración de la IA
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    r = CliRunner().invoke(app, ["analyze", "-c", "pacma", "-v", "generales-2026"])
    assert r.exit_code == 1
    assert "no es una candidatura principal" in r.output
    assert "--forzar-no-principal" in r.output
