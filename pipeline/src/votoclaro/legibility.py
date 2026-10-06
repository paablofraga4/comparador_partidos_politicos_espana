"""Validación automática de lectura fácil (spec 001, HU-1.4; reglas derivadas de UNE 153101 EX).

INFLESZ (Barrio-Cantalejo, 2008) sobre el índice de Szigriszt-Pazos:
    P = 206,835 − 62,3 · (sílabas / palabras) − (palabras / frases)
Escala: < 40 muy difícil · 40-55 algo difícil · 55-65 normal · 65-80 bastante fácil ·
> 80 muy fácil.
"""

from __future__ import annotations

import re

from .models import Legibilidad

MIN_INFLESZ = 60.0  # obligatorio (por debajo bloquea)
TARGET_INFLESZ = 65.0  # objetivo («bastante fácil»): entre 60 y 65, aviso no bloqueante
AVISO = "Aviso:"
MAX_WORDS_SENTENCE = 20

_STRONG = set("aeoáéóíú")  # vocales que forman núcleo propio (í/ú acentuadas rompen diptongo)
_VOWELS = set("aeiouáéíóúü")
_WORD = re.compile(r"[a-záéíóúüñA-ZÁÉÍÓÚÜÑ]+|\d+(?:[.,]\d+)*")
_SENTENCE_SPLIT = re.compile(r"(?<=[.!?…])\s+|\n+")
# Siglas; se excluyen códigos de carreteras y similares (AP-15, N-121-A): son nombres propios
_ACRONYM = re.compile(r"\b[A-ZÁÉÍÓÚÑ]{2,}\b(?![-‑]\d)")
_DOUBLE_NEG = re.compile(r"\bno\b[^.]*\b(nunca|nada|nadie|ningun[oa]?s?|tampoco)\b", re.IGNORECASE)

# Siglas que el público general conoce o que son nombres propios de candidaturas
ALLOWED_ACRONYMS = set(
    """IVA UE ONU OTAN DNI PP PSOE VOX ERC PNV BNG CC UPN AHI ASG EH ESO FP COVID LGTBI IPC SMI PIB
    TV ONG""".split()
)


def count_syllables(word: str) -> int:
    w = word.lower()
    if w.isdigit():
        return max(1, len(w))
    count = 0
    prev_vowel = None
    for ch in w:
        if ch in _VOWELS:
            if prev_vowel is None:
                count += 1
            elif ch in _STRONG and prev_vowel in _STRONG:
                count += 1  # hiato: dos vocales fuertes
            prev_vowel = ch
        else:
            prev_vowel = None
    # "y" final actúa como vocal (hoy, ley) sin añadir sílaba si sigue a vocal
    if w.endswith("y") and len(w) > 1 and w[-2] not in _VOWELS:
        count += 1
    return max(1, count)


def sentences(text: str) -> list[str]:
    return [s.strip() for s in _SENTENCE_SPLIT.split(text) if s.strip()]


def inflesz(texts: list[str]) -> float:
    sents = [s for t in texts for s in sentences(t)]
    words = [w for s in sents for w in _WORD.findall(s)]
    if not sents or not words:
        return 0.0
    syl = sum(count_syllables(w) for w in words)
    return round(206.835 - 62.3 * (syl / len(words)) - (len(words) / len(sents)), 1)


def hardest_sentences(texts: list[str], n: int = 3) -> list[tuple[str, float]]:
    """Las frases con peor INFLESZ individual (para dar al modelo una corrección concreta)."""
    scored = [(s, inflesz([s])) for t in texts for s in sentences(t)]
    return sorted(scored, key=lambda x: x[1])[:n]


def check(texts: list[str], extra_allowed: set[str] | None = None) -> Legibilidad:
    allowed = ALLOWED_ACRONYMS | (extra_allowed or set())
    avisos: list[str] = []
    max_words = 0
    for t in texts:
        for s in sentences(t):
            n = len(_WORD.findall(s))
            max_words = max(max_words, n)
            if n > MAX_WORDS_SENTENCE:
                avisos.append(f"Frase de {n} palabras (máx. {MAX_WORDS_SENTENCE}): «{s[:80]}»")
            if _DOUBLE_NEG.search(s):
                avisos.append(f"Doble negación: «{s[:80]}»")
        for a in sorted(set(_ACRONYM.findall(t)) - allowed):
            if f"Sigla sin explicar: {a}" not in avisos:
                avisos.append(f"Sigla sin explicar: {a}")
    score = inflesz(texts)
    if score < MIN_INFLESZ:
        avisos.append(f"INFLESZ {score} < {MIN_INFLESZ} (texto demasiado difícil)")
    ok = not avisos
    if MIN_INFLESZ <= score < TARGET_INFLESZ:
        avisos.append(f"{AVISO} INFLESZ {score} por debajo del objetivo {TARGET_INFLESZ}")
    return Legibilidad(inflesz=score, max_palabras_frase=max_words, ok=ok, avisos=avisos)
