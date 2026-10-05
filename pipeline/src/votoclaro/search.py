"""Búsqueda léxica BM25 sobre chunks (red de seguridad de «no menciona», spec 001).

Solo se usa en el pipeline; el chat usa la búsqueda híbrida de Postgres (plan D7).
"""

from __future__ import annotations

import math
import re
import unicodedata
from collections import Counter

from .models import Chunk, Tema

_STOP = set(
    """a al algo ante antes como con contra cual cuando de del desde donde durante e el ella ellas
    ellos en entre era es esa ese eso esta este esto estos fue ha han hasta la las le les lo los mas
    me mi mientras muy ni no nos o otra otro para pero por porque que quien se ser si sin sobre su
    sus tambien tanto te tiene tienen todo todos tras tu un una uno unos y ya""".split()
)
_TOKEN = re.compile(r"[a-zñ0-9]+")


def _fold(text: str) -> str:
    t = unicodedata.normalize("NFKD", text.lower())
    return "".join(c for c in t if not unicodedata.combining(c))


def tokens(text: str) -> list[str]:
    out = []
    for t in _TOKEN.findall(_fold(text)):
        if t in _STOP or len(t) < 3:
            continue
        # «stemming» mínimo: plural y género
        for suf in ("es", "s", "a", "o"):
            if len(t) > 5 and t.endswith(suf):
                t = t[: -len(suf)]
                break
        out.append(t)
    return out


class BM25:
    def __init__(self, chunks: list[Chunk], k1: float = 1.4, b: float = 0.75) -> None:
        self.chunks = chunks
        self.docs = [Counter(tokens(f"{c.contexto} {c.texto}")) for c in chunks]
        self.lens = [sum(d.values()) for d in self.docs]
        self.avg = (sum(self.lens) / len(self.lens)) if self.lens else 0
        df: Counter[str] = Counter()
        for d in self.docs:
            df.update(d.keys())
        n = len(self.docs)
        self.idf = {t: math.log(1 + (n - f + 0.5) / (f + 0.5)) for t, f in df.items()}
        self.k1, self.b = k1, b

    def search(self, query: str, k: int = 8) -> list[tuple[Chunk, float, int]]:
        """Devuelve (chunk, puntuación, nº de términos distintos de la consulta presentes)."""
        q = set(tokens(query))
        scored = []
        for c, d, n in zip(self.chunks, self.docs, self.lens, strict=True):
            s = 0.0
            hits = 0
            for t in q:
                f = d.get(t)
                if not f:
                    continue
                hits += 1
                s += (
                    self.idf[t]
                    * f
                    * (self.k1 + 1)
                    / (f + self.k1 * (1 - self.b + self.b * n / self.avg))
                )
            if s > 0:
                scored.append((c, s, hits))
        scored.sort(key=lambda x: x[1], reverse=True)
        return scored[:k]


def topic_query(tema: Tema) -> str:
    return " ".join([tema.nombre, tema.descripcion, *tema.subtemas])


def safety_net_candidates(index: BM25, tema: Tema, k: int = 6, min_hits: int = 2) -> list[Chunk]:
    """Fragmentos que podrían tratar el tema aunque el análisis diga «no menciona»."""
    return [c for c, _, hits in index.search(topic_query(tema), k=k) if hits >= min_hits]
