from __future__ import annotations

from pathlib import Path

from votoclaro.boe import emparejar, parse, separar_siglas, slug, titulo
from votoclaro.paths import ROOT, Paths
from votoclaro.registry import load_candidaturas

FIXTURE = Path(__file__).parent / "fixtures" / "boe_candidaturas_2023_extracto.xml"


def test_siglas_con_parentesis_anidados_y_espacios_unicode():
    assert separar_siglas(
        "3. PARTIDO SOCIALISTA DE EUSKADI-EUSKADIKO EZKERRA (PSOE) (PSE-EE\xa0(PSOE))"
    ) == ("PARTIDO SOCIALISTA DE EUSKADI-EUSKADIKO EZKERRA (PSOE)", "PSE-EE (PSOE)")
    assert separar_siglas("7. VOX (VOX)") == ("VOX", "VOX")
    assert separar_siglas("Texto sin siglas") is None


def test_nombres_y_slugs_de_provincia():
    assert titulo("SANTA CRUZ DE TENERIFE") == "Santa Cruz de Tenerife"
    assert slug("Álava") == "alava" and slug("A Coruña") == "a-coruna"


def test_parse_documento_real_2023():
    doc = parse(FIXTURE.read_text(encoding="utf-8"))
    assert doc.identificador == "BOE-A-2023-15066"
    assert set(doc.circunscripciones) == {"albacete", "barcelona", "bizkaia", "navarra"}
    # PSE-EE (PSOE) en Bizkaia, PSC en Barcelona, PSN-PSOE en Navarra: el PSOE con otras siglas
    assert {"PSE-EE (PSOE)", "PSC", "PSN-PSOE", "PSOE"} <= set(doc.candidaturas)
    assert set(doc.candidaturas["PP"].circunscripciones) == set(doc.circunscripciones)
    assert list(doc.candidaturas["UPN"].circunscripciones) == ["navarra"]


def test_emparejar_con_el_registro():
    doc = parse(FIXTURE.read_text(encoding="utf-8"))
    registro = load_candidaturas(Paths(ROOT / "data")).candidaturas
    asignadas, sueltas = emparejar(doc, registro)
    psoe = {c.siglas for c in asignadas["psoe"]}
    assert psoe == {"PSOE", "PSC", "PSE-EE (PSOE)", "PSN-PSOE"}
    assert {c.siglas for c in asignadas["sumar"]} == {"SUMAR", "SUMAR-ECP"}
    assert "geroa-bai" in asignadas and "upn" in asignadas and "pnv" in asignadas
    # Las candidaturas sin representación quedan como nuevas (criterio del BOE: entran todas)
    nuevas = {c.siglas for c in sueltas}
    assert {"PACMA", "FO", "RECORTES CERO"} <= nuevas
    assert not nuevas & {"PP", "VOX", "PSC", "EH Bildu", "EAJ-PNV"}
