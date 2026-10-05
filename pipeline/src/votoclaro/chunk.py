"""Fragmentación en chunks con cabecera contextual (spec 001: recuperación contextual).

Reglas: un chunk nunca cruza de página (las citas se localizan en una sola página), un
encabezado abre chunk nuevo, y el tamaño objetivo es de ~120-320 palabras.
"""

from __future__ import annotations

import hashlib

from .models import Bloque, Candidatura, Chunk, Pagina
from .textnorm import word_count

TARGET_WORDS = 220
MAX_WORDS = 320
MIN_WORDS = 40

CONV_NOMBRE = {"generales-2023": "Generales 23J-2023", "generales-2026": "Generales 29N-2026"}


def _union(boxes: list[tuple[float, float, float, float]]) -> tuple[float, float, float, float]:
    return (
        min(b[0] for b in boxes),
        min(b[1] for b in boxes),
        max(b[2] for b in boxes),
        max(b[3] for b in boxes),
    )


def chunk_id(cand: str, conv: str, page: int, n: int) -> str:
    return f"{cand}-{conv[-2:]}-p{page:03d}-{n:02d}"


def make_chunks(pages: list[Pagina], cand: Candidatura, conv: str) -> list[Chunk]:
    chunks: list[Chunk] = []
    for page in pages:
        groups: list[list[Bloque]] = []
        current: list[Bloque] = []
        words = 0
        for b in page.bloques:
            w = word_count(b.texto)
            starts_section = b.titulo is not None and words >= MIN_WORDS
            too_big = current and words + w > MAX_WORDS
            if current and (starts_section or too_big or words >= TARGET_WORDS):
                groups.append(current)
                current, words = [], 0
            current.append(b)
            words += w
        if current:
            # Un resto muy pequeño se une al grupo anterior de la misma página
            if groups and words < MIN_WORDS and not current[0].titulo:
                groups[-1].extend(current)
            else:
                groups.append(current)

        for n, group in enumerate(groups, start=1):
            texto = "\n".join(b.texto for b in group)
            seccion = next((b.seccion for b in reversed(group) if b.seccion), [])
            etiqueta = page.etiqueta or str(page.pagina)
            contexto = " · ".join(
                x
                for x in (
                    cand.nombre,
                    CONV_NOMBRE.get(conv, conv),
                    " > ".join(seccion) if seccion else None,
                    f"p. {etiqueta}",
                )
                if x
            )
            chunks.append(
                Chunk(
                    id=chunk_id(cand.id, conv, page.pagina, n),
                    convocatoria=conv,
                    candidatura=cand.id,
                    pagina=page.pagina,
                    etiqueta=page.etiqueta,
                    seccion=seccion,
                    bbox=_union([b.bbox for b in group]),
                    texto=texto,
                    contexto=contexto,
                    hash=hashlib.sha1(f"{contexto}\n{texto}".encode()).hexdigest()[:16],
                )
            )
    return chunks
