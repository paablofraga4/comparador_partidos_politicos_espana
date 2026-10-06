"""Candidaturas al Congreso publicadas en el BOE (spec 001: fase BOE; spec 002: «Tu papeleta»).

El BOE publica un documento por fase (presentadas ~día 22, proclamadas ~día 28) con la
estructura: «JUNTA ELECTORAL DE {PROVINCIA}» → «CONGRESO DE LOS DIPUTADOS» | «SENADO» →
«N. NOMBRE (SIGLAS)» y sus candidatos. Aquí solo interesan las candidaturas al Congreso.
"""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass, field

import httpx

from .fetch import USER_AGENT
from .models import Candidatura

_PARRAFO = re.compile(r'<p class="([a-z_]+)"[^>]*>(.*?)</p>', re.S)
_TAG = re.compile(r"<[^>]+>")
_NUM = re.compile(r"^\d+\.\s*")
_MINUSCULAS = {
    "de",
    "del",
    "la",
    "las",
    "los",
    "y",
    "e",
    "con",
    "el",
    "en",
    "por",
    "para",
    "a",
    "al",
    "o",
    "u",
    "dos",
    "da",
    "das",
    "do",
    "i",
    "per",
    "dels",
    "les",
}


def normalizar(texto: str) -> str:
    """NFKC (espacios finos y duros → espacio normal) y espacios colapsados."""
    t = unicodedata.normalize("NFKC", texto).replace(" ", " ")
    return " ".join(t.split())


def slug(texto: str) -> str:
    t = unicodedata.normalize("NFKD", texto.lower())
    t = "".join(c for c in t if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]+", "-", t).strip("-")


def titulo(texto: str) -> str:
    """«PARTIDO ANIMALISTA CON EL MEDIO AMBIENTE» → «Partido Animalista con el Medio Ambiente»."""
    palabras = texto.lower().split()
    return " ".join(
        p if (i > 0 and p in _MINUSCULAS) else p[:1].upper() + p[1:] for i, p in enumerate(palabras)
    )


def separar_siglas(linea: str) -> tuple[str, str] | None:
    """«3. PARTIDO … (PSOE) (PSE-EE (PSOE))» → («PARTIDO …(PSOE)», «PSE-EE (PSOE)»).
    Las siglas son el último grupo entre paréntesis equilibrado."""
    t = _NUM.sub("", normalizar(linea))
    if not t.endswith(")"):
        return None
    nivel = 0
    for i in range(len(t) - 1, -1, -1):
        if t[i] == ")":
            nivel += 1
        elif t[i] == "(":
            nivel -= 1
            if nivel == 0:
                return t[:i].strip(), t[i + 1 : -1].strip()
    return None


@dataclass
class CandidaturaBOE:
    siglas: str
    nombre: str
    circunscripciones: dict[str, str] = field(default_factory=dict)  # slug → nombre


@dataclass
class DocumentoBOE:
    identificador: str
    titulo: str
    circunscripciones: dict[str, str]  # slug → nombre (solo las que tienen Congreso)
    candidaturas: dict[str, CandidaturaBOE]  # siglas normalizadas → candidatura


def parse(xml: str) -> DocumentoBOE:
    ident = re.search(r"<identificador>(.*?)</identificador>", xml)
    tit = re.search(r"<titulo>(.*?)</titulo>", xml, re.S)
    junta: tuple[str, str] | None = None
    camara = ""
    circs: dict[str, str] = {}
    cands: dict[str, CandidaturaBOE] = {}
    for clase, html in _PARRAFO.findall(xml):
        texto = normalizar(_TAG.sub("", html))
        if clase == "centro_negrita" and texto.upper().startswith("JUNTA ELECTORAL DE"):
            nombre = titulo(texto[len("JUNTA ELECTORAL DE") :].strip())
            junta = (slug(nombre), nombre)
        elif clase == "centro_cursiva":
            camara = texto.upper()
        elif clase == "centro_redonda" and junta and camara.startswith("CONGRESO"):
            par = separar_siglas(texto)
            if not par:
                continue
            nombre, siglas = par
            circs[junta[0]] = junta[1]
            c = cands.setdefault(siglas, CandidaturaBOE(siglas, nombre))
            c.circunscripciones[junta[0]] = junta[1]
    return DocumentoBOE(
        ident.group(1) if ident else "",
        normalizar(tit.group(1)) if tit else "",
        dict(sorted(circs.items())),
        cands,
    )


def descargar(identificador: str, client: httpx.Client | None = None) -> str:
    own = client is None
    client = client or httpx.Client(headers={"User-Agent": USER_AGENT})
    try:
        r = client.get(f"https://www.boe.es/diario_boe/xml.php?id={identificador}", timeout=120)
        r.raise_for_status()
        return r.text
    finally:
        if own:
            client.close()


def emparejar(
    doc: DocumentoBOE, registro: list[Candidatura]
) -> tuple[dict[str, list[CandidaturaBOE]], list[CandidaturaBOE]]:
    """Asigna cada candidatura del BOE a una entrada del registro por sus `siglas_boe`
    (expresiones regulares). Devuelve (id → candidaturas del BOE, sin emparejar)."""
    asignadas: dict[str, list[CandidaturaBOE]] = {}
    sueltas: list[CandidaturaBOE] = []
    for c in doc.candidaturas.values():
        destino = next(
            (r.id for r in registro if any(re.fullmatch(p, c.siglas, re.I) for p in r.siglas_boe)),
            None,
        )
        if destino:
            asignadas.setdefault(destino, []).append(c)
        else:
            sueltas.append(c)
    return asignadas, sueltas
