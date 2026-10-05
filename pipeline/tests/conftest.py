from __future__ import annotations

import shutil
from pathlib import Path

import pymupdf
import pytest

from votoclaro.paths import ROOT, Paths

PROGRAMA = [
    # (página, [(tipo, texto)])
    (
        1,
        [
            ("h1", "1. Vivienda"),
            (
                "p",
                "Aprobaremos una ley estatal de vivienda que limite el precio del alquiler en las "
                "zonas tensionadas durante un periodo de cinco años.",
            ),
            (
                "p",
                "Construiremos 200.000 viviendas públicas en alquiler asequible antes de 2030, "
                "priorizando a jóvenes y familias con menos recursos.",
            ),
        ],
    ),
    (
        2,
        [
            ("h1", "2. Pensiones"),
            (
                "p",
                "Garantizaremos la revalorización de las pensiones conforme al IPC para mantener "
                "el poder adquisitivo de los pensionistas.",
            ),
            ("h2", "2.1 Pensiones mínimas"),
            (
                "p",
                "Elevaremos las pensiones mínimas y no contributivas hasta alcanzar el umbral de "
                "la pobreza en esta legislatura.",
            ),
        ],
    ),
    (
        3,
        [
            ("h1", "3. Sanidad"),
            (
                "p",
                "Reduciremos las listas de espera quirúrgicas a un máximo de noventa días en todo "
                "el Sistema Nacional de Salud.",
            ),
        ],
    ),
]


def build_pdf(path: Path, with_toc: bool = True) -> None:
    doc = pymupdf.open()
    toc = []
    for num, items in PROGRAMA:
        page = doc.new_page(width=595, height=842)
        y = 72
        for kind, text in items:
            size = {"h1": 18, "h2": 14, "p": 10}[kind]
            rect = pymupdf.Rect(72, y, 523, y + (40 if kind != "p" else 70))
            page.insert_textbox(
                rect, text, fontsize=size, fontname="helv" if kind == "p" else "hebo"
            )
            if kind in ("h1", "h2"):
                toc.append([1 if kind == "h1" else 2, text, num])
            y += 50 if kind != "p" else 80
    if with_toc:
        doc.set_toc(toc)
    doc.save(path)


@pytest.fixture
def data_dir(tmp_path: Path) -> Paths:
    """Copia los registros reales a un data/ temporal para no tocar el repo."""
    d = tmp_path / "data"
    d.mkdir()
    for name in ("candidaturas.yaml", "topics.yaml"):
        shutil.copy(ROOT / "data" / name, d / name)
    return Paths(d)


@pytest.fixture
def sample_pdf(tmp_path: Path) -> Path:
    p = tmp_path / "programa.pdf"
    build_pdf(p)
    return p
