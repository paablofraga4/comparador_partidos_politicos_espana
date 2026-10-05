"""Extracción de texto por página con posiciones y estructura de secciones (PyMuPDF).

Spec 001, HU-1.2. Produce `<cand>.pages.jsonl` y `<cand>.meta.json` en `data/extracted/<conv>/`.
"""

from __future__ import annotations

import re
from collections import Counter
from pathlib import Path

import pymupdf

from .models import Bloque, DocumentoMeta, Pagina

# Por debajo de esta media de caracteres por página asumimos PDF escaneado (necesita OCR).
MIN_CHARS_PER_PAGE = 80
MIN_TOC_ENTRIES = 3
_BOLD_FLAG = 1 << 4

_STOPWORDS = {
    "es": [
        "de",
        "la",
        "que",
        "el",
        "en",
        "los",
        "las",
        "del",
        "por",
        "con",
        "una",
        "para",
        "como",
        "más",
        "pero",
        "sus",
        "este",
        "esta",
        "también",
    ],
    "ca": [
        "de",
        "la",
        "que",
        "el",
        "en",
        "els",
        "les",
        "del",
        "per",
        "amb",
        "una",
        "per",
        "com",
        "més",
        "però",
        "seus",
        "aquest",
        "aquesta",
        "també",
    ],
    "gl": [
        "de",
        "a",
        "que",
        "o",
        "en",
        "os",
        "as",
        "do",
        "da",
        "por",
        "con",
        "unha",
        "para",
        "como",
        "máis",
        "pero",
        "seus",
        "este",
        "esta",
        "tamén",
    ],
    "eu": [
        "eta",
        "da",
        "ez",
        "du",
        "bat",
        "dira",
        "ere",
        "edo",
        "baina",
        "beste",
        "dute",
        "izan",
        "behar",
        "hori",
        "hau",
        "horiek",
        "dituzte",
    ],
}


def detect_language(text: str) -> str:
    words = Counter(re.findall(r"[a-záéíóúàèòïüñç·]+", text.lower()))
    scores = {lang: sum(words[w] for w in sw) for lang, sw in _STOPWORDS.items()}
    # Desempate es/gl/ca por palabras muy distintivas
    scores["ca"] += 3 * (words["els"] + words["amb"] + words["però"] + words["aquesta"])
    scores["gl"] += 3 * (words["unha"] + words["tamén"] + words["máis"])
    scores["es"] += 3 * (words["los"] + words["una"] + words["pero"] + words["también"])
    return max(scores, key=scores.get) if any(scores.values()) else "es"


def _block_from_dict(b: dict) -> Bloque | None:
    lines = []
    sizes: Counter[float] = Counter()
    bold_chars = 0
    total = 0
    for line in b.get("lines", []):
        spans = line.get("spans", [])
        txt = "".join(s.get("text", "") for s in spans)
        if txt.strip():
            lines.append(txt)
        for s in spans:
            n = len(s.get("text", "").strip())
            sizes[round(s.get("size", 0), 1)] += n
            total += n
            if s.get("flags", 0) & _BOLD_FLAG:
                bold_chars += n
    text = "\n".join(lines).strip()
    if not text:
        return None
    size = sizes.most_common(1)[0][0] if sizes else 0.0
    return Bloque(
        bbox=tuple(round(v, 2) for v in b["bbox"]),
        texto=text,
        size=size,
        bold=total > 0 and bold_chars / total > 0.6,
    )


def _body_size(pages: list[list[Bloque]]) -> float:
    c: Counter[float] = Counter()
    for blocks in pages:
        for b in blocks:
            c[b.size] += len(b.texto)
    return c.most_common(1)[0][0] if c else 10.0


def _heading_levels(pages: list[list[Bloque]], body: float) -> dict[float, int]:
    """Asigna niveles 1..3 a los tamaños de letra claramente mayores que el cuerpo."""
    sizes = sorted(
        {b.size for blocks in pages for b in blocks if b.size >= body * 1.18}, reverse=True
    )
    return {s: min(i + 1, 3) for i, s in enumerate(sizes[:3])} | {s: 3 for s in sizes[3:]}


def _is_heading_text(t: str) -> bool:
    one_line = " ".join(t.split())
    return (
        2 <= len(one_line) <= 140
        and not one_line.endswith((".", ";", ":", ","))
        and not re.fullmatch(r"[\d\s.\-–]+", one_line)
    )


def extract(
    pdf_path: Path, conv: str, cand: str, sha256: str
) -> tuple[DocumentoMeta, list[Pagina]]:
    doc = pymupdf.open(pdf_path)
    raw_pages: list[list[Bloque]] = []
    for page in doc:
        d = page.get_text("dict")
        blocks = [bl for b in d["blocks"] if b.get("type") == 0 and (bl := _block_from_dict(b))]
        raw_pages.append(blocks)

    body = _body_size(raw_pages)
    levels = _heading_levels(raw_pages, body)
    toc = [
        (int(lvl), str(title).strip(), int(pg)) for lvl, title, pg, *_ in doc.get_toc(simple=True)
    ]
    # Un índice con muy pocas entradas no describe la estructura: se usa la tipografía.
    if len(toc) < MIN_TOC_ENTRIES:
        toc = []
    toc_by_page: dict[int, list[tuple[int, str]]] = {}
    for lvl, title, pg in toc:
        toc_by_page.setdefault(pg, []).append((lvl, title))

    path: list[str] = []

    def push(level: int, title: str) -> None:
        nonlocal path
        title = " ".join(title.split())
        path = path[: max(level - 1, 0)] + [title]

    pages: list[Pagina] = []
    total_chars = 0
    for i, (page, blocks) in enumerate(zip(doc, raw_pages, strict=True), start=1):
        if toc:
            for lvl, title in toc_by_page.get(i, []):
                push(min(lvl, 3), title)
        for b in blocks:
            lvl = levels.get(b.size)
            if lvl is None and b.bold and b.size >= body * 1.05 and len(b.texto) < 90:
                lvl = 3
            if lvl is not None and _is_heading_text(b.texto):
                b.titulo = lvl
                if not toc:  # con índice del PDF, la jerarquía la marca el índice
                    push(lvl, b.texto)
            b.seccion = list(path)
        text = page.get_text("text")
        total_chars += len(text.strip())
        pages.append(
            Pagina(
                pagina=i,
                etiqueta=(page.get_label() or None),
                ancho=round(page.rect.width, 2),
                alto=round(page.rect.height, 2),
                texto=text,
                bloques=blocks,
            )
        )

    sample = " ".join(p.texto for p in pages[: min(len(pages), 15)])
    meta = DocumentoMeta(
        id=f"{conv}/{cand}",
        convocatoria=conv,
        candidatura=cand,
        sha256=sha256,
        paginas=len(pages),
        idioma=detect_language(sample),
        ocr=False,
        caracteres=total_chars,
        toc=toc,
    )
    return meta, pages


def needs_ocr(meta: DocumentoMeta) -> bool:
    return meta.paginas > 0 and meta.caracteres / meta.paginas < MIN_CHARS_PER_PAGE
