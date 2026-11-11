"""Pruebas del script que crea las issues de vigilancia (`.github/scripts/vigilancia_issues.py`)."""

from __future__ import annotations

import importlib.util

from votoclaro.paths import ROOT

_spec = importlib.util.spec_from_file_location(
    "vigilancia_issues", ROOT / ".github" / "scripts" / "vigilancia_issues.py"
)
assert _spec and _spec.loader
vi = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(vi)

# Las direcciones de Google News miden unos 800 caracteres; la búsqueda de GitHub admite 256
LARGA = "https://news.google.com/rss/articles/" + "A" * 780 + "?oc=5"


def _n(url: str, cand: str = "pp") -> dict:
    return {
        "candidatura": cand,
        "tipo": "noticia",
        "url": url,
        "titulo": "t",
        "fecha": "2026-11-10",
    }


def test_no_repite_una_noticia_que_ya_esta_en_una_issue():
    cuerpo = f"- [El PP presenta su programa]({LARGA}) · 2026-11-10"
    assert vi.filtrar_nuevas([_n(LARGA)], cuerpo) == []


def test_deja_pasar_solo_las_que_no_estan():
    nueva = LARGA.replace("AAAA", "BBBB", 1)
    conocidas = f"- [x]({LARGA})\n- [y](https://ejemplo.es/otra)"
    assert [n["url"] for n in vi.filtrar_nuevas([_n(LARGA), _n(nueva)], conocidas)] == [nueva]


def test_agrupa_las_noticias_por_candidatura():
    grupos = vi.agrupar_noticias([_n("u1"), _n("u2", "vox"), _n("u3")])
    assert {k: [n["url"] for n in v] for k, v in grupos.items()} == {
        "pp": ["u1", "u3"],
        "vox": ["u2"],
    }
    titulo, cuerpo = vi.issue_de_noticias("pp", grupos["pp"])
    assert titulo == "Noticias sobre el programa de pp (2)"
    assert "u1" in cuerpo and "u3" in cuerpo
