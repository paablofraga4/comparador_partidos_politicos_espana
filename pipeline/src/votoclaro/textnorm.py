"""Normalización de texto para verificar citas literales (skill `grounding`).

Se normalizan solo artefactos tipográficos (comillas, guiones, ligaduras, cortes de línea);
nunca mayúsculas ni tildes: un literal debe ser literal.
"""

from __future__ import annotations

import re
import unicodedata

_TRANSLATE = str.maketrans(
    {
        "“": '"',
        "”": '"',
        "„": '"',
        "«": '"',
        "»": '"',
        "‘": "'",
        "’": "'",
        "‚": "'",
        "′": "'",
        "–": "-",
        "—": "-",
        "‐": "-",
        "‑": "-",
        "−": "-",
        "­": None,  # guion blando
        "•": " ",
        "●": " ",
        "▪": " ",
        "": " ",  # viñetas
    }
)

_HYPHEN_BREAK = re.compile(r"(\w)-[ \t]*\r?\n[ \t]*(\w)")
_SPACES = re.compile(r"\s+")


def normalize(text: str) -> str:
    t = unicodedata.normalize("NFKC", text).translate(_TRANSLATE)
    t = _HYPHEN_BREAK.sub(r"\1\2", t)
    return _SPACES.sub(" ", t).strip()


def loose(text: str) -> str:
    """Variante insensible a guiones: absorbe divisiones silábicas que no terminan en salto."""
    return _SPACES.sub(" ", normalize(text).replace("- ", "").replace("-", "")).strip()


def contains_literal(haystack: str, literal: str) -> bool:
    lit = normalize(literal)
    if not lit:
        return False
    hay = normalize(haystack)
    return lit in hay or loose(lit) in loose(hay)


def word_count(text: str) -> int:
    return len(re.findall(r"\w+", text))
