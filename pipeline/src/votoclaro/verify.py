"""Verificación determinista de citas y cálculo de rectángulos de resaltado (spec 001, HU-1.5).

Una cita está verificada si su literal (normalizado) es subcadena del chunk citado. Además se
localiza en la página del PDF con `search_for` para que la web pueda resaltarla.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

import pymupdf

from .models import Chunk, Cita, Rect
from .textnorm import contains_literal

_SEARCH_FLAGS = pymupdf.TEXT_DEHYPHENATE | pymupdf.TEXT_PRESERVE_WHITESPACE
WINDOW = 6  # palabras por ventana en la búsqueda por tramos
MIN_COVERAGE = 0.6  # fracción del literal que debe localizarse para considerarlo resaltado
_MARGIN = 6.0  # puntos de holgura alrededor de la caja del chunk


@dataclass
class Resultado:
    verificada: bool
    rects: list[Rect]

    @property
    def resaltada(self) -> bool:
        return bool(self.rects)


def _inside(r: pymupdf.Rect, bbox: tuple[float, float, float, float]) -> bool:
    x0, y0, x1, y1 = bbox
    return (
        r.y1 >= y0 - _MARGIN
        and r.y0 <= y1 + _MARGIN
        and r.x1 >= x0 - _MARGIN
        and r.x0 <= x1 + _MARGIN
    )


def _norm(r: pymupdf.Rect, page: pymupdf.Page, pagina: int) -> Rect:
    w, h = page.rect.width, page.rect.height
    return Rect(
        pagina=pagina,
        r=(round(r.x0 / w, 4), round(r.y0 / h, 4), round(r.x1 / w, 4), round(r.y1 / h, 4)),
    )


def _tok(palabra: str) -> str:
    """Forma comparable de una palabra: minúsculas, sin puntuación ni guiones."""
    return re.sub(r"[\W_]", "", palabra.lower())


def locate_palabras(
    page: pymupdf.Page, literal: str, bbox: tuple[float, float, float, float]
) -> list[pymupdf.Rect]:
    """Empareja el literal palabra a palabra con las palabras de la página (con su posición).
    Tolera palabras partidas por guion entre líneas («Na-» + «varro» = «Navarro»), que
    `search_for` no siempre encuentra. Devuelve un rectángulo por línea."""
    objetivo = [t for t in (_tok(w) for w in literal.split()) if t]
    if not objetivo:
        return []
    palabras = [
        (pymupdf.Rect(w[:4]), w[4], (w[5], w[6]))
        for w in page.get_text("words")
        if _inside(pymupdf.Rect(w[:4]), bbox)
    ]
    toks = [_tok(p[1]) for p in palabras]
    n = len(palabras)
    for inicio in range(n):
        i, j, usadas = inicio, 0, []
        while i < n and j < len(objetivo):
            if toks[i] == objetivo[j]:
                usadas.append(i)
                i, j = i + 1, j + 1
            elif (
                i + 1 < n
                and palabras[i][1].rstrip().endswith(("-", "­", "‐"))
                and toks[i] + toks[i + 1] == objetivo[j]
            ):
                usadas += [i, i + 1]
                i, j = i + 2, j + 1
            elif not toks[i]:  # viñetas o símbolos sueltos entre palabras
                i += 1
            else:
                break
        if j == len(objetivo):
            lineas: dict[tuple[int, int], pymupdf.Rect] = {}
            for k in usadas:
                r, _, linea = palabras[k]
                lineas[linea] = lineas[linea] | r if linea in lineas else pymupdf.Rect(r)
            return list(lineas.values())
    return []


def locate(
    page: pymupdf.Page, literal: str, bbox: tuple[float, float, float, float]
) -> list[pymupdf.Rect]:
    por_palabras = locate_palabras(page, literal, bbox)
    if por_palabras:
        return por_palabras
    lit = " ".join(literal.split())
    hits = [r for r in page.search_for(lit, flags=_SEARCH_FLAGS) if _inside(r, bbox)]
    if hits:
        return hits
    words = lit.split()
    found: list[pymupdf.Rect] = []
    covered = 0
    for i in range(0, len(words), WINDOW):
        seg = words[i : i + WINDOW]
        if len(seg) < 3 and found:  # cola corta: no aporta y puede dar falsos positivos
            covered += len(seg)
            continue
        rs = [r for r in page.search_for(" ".join(seg), flags=_SEARCH_FLAGS) if _inside(r, bbox)]
        if rs:
            found.extend(rs[:2])
            covered += len(seg)
    return found if words and covered / len(words) >= MIN_COVERAGE else []


def verify_citation(cita: Cita, chunk: Chunk, doc: pymupdf.Document) -> Resultado:
    if chunk.pagina != cita.pagina or not contains_literal(chunk.texto, cita.literal):
        return Resultado(False, [])
    page = doc[chunk.pagina - 1]
    rects = [_norm(r, page, chunk.pagina) for r in locate(page, cita.literal, chunk.bbox)]
    return Resultado(True, rects)


def apply(cita: Cita, chunk: Chunk | None, doc: pymupdf.Document) -> Cita:
    """Devuelve la cita con `verificada`, `resaltada` y `rects` recalculados."""
    if chunk is None:
        return cita.model_copy(update={"verificada": False, "resaltada": False, "rects": []})
    res = verify_citation(cita, chunk, doc)
    return cita.model_copy(
        update={
            "verificada": res.verificada,
            "resaltada": res.resaltada,
            "rects": res.rects,
            "pagina_impresa": chunk.etiqueta or cita.pagina_impresa,
        }
    )
