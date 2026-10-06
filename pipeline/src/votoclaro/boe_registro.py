"""Aplica un documento de candidaturas del BOE al registro (constitución I.6; spec 001).

- Candidaturas ya registradas (por `siglas_boe`): estado, circunscripciones y siglas por
  circunscripción («listas»).
- Candidaturas nuevas: se dan de alta con datos mínimos y color neutro (sin filtro editorial).
- Fase «proclamadas»: las que se presentaron y no aparecen pasan a «no-proclamada».
- Escribe también data/circunscripciones.yaml (para «Tu papeleta»).
Conserva los comentarios del YAML (ruamel).
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path

from ruamel.yaml import YAML
from ruamel.yaml.comments import CommentedMap, CommentedSeq

from .boe import DocumentoBOE, emparejar, slug, titulo
from .models import RegistroCandidaturas

CONV = "generales-2026"
COLOR_NEUTRO = "#8A8F9A"
ESTADO = {"presentadas": "presentada", "proclamadas": "proclamada"}


@dataclass
class Resumen:
    actualizadas: list[str] = field(default_factory=list)
    nuevas: list[str] = field(default_factory=list)
    no_proclamadas: list[str] = field(default_factory=list)
    circunscripciones: int = 0

    def markdown(self, doc: DocumentoBOE, fase: str) -> str:
        return "\n".join(
            [
                f"# Candidaturas {fase} · {doc.identificador}",
                "",
                f"_{doc.titulo}_",
                "",
                f"- Circunscripciones con candidaturas al Congreso: **{self.circunscripciones}**",
                f"- Candidaturas ya registradas actualizadas: **{len(self.actualizadas)}** "
                f"({', '.join(self.actualizadas) or '—'})",
                f"- Candidaturas nuevas dadas de alta: **{len(self.nuevas)}** "
                f"({', '.join(self.nuevas) or '—'})",
                f"- No proclamadas: {', '.join(self.no_proclamadas) or 'ninguna'}",
                "",
                "Revisa en el diff que los alias (`siglas_boe`) no hayan unido candidaturas "
                "distintas.",
                "Las nuevas llevan color neutro y sin web: complétalo si procede.",
            ]
        )


def _yaml() -> YAML:
    y = YAML()
    y.preserve_quotes = True
    y.width = 100
    y.indent(mapping=2, sequence=4, offset=2)
    return y


def _flow(items: list) -> CommentedSeq:
    s = CommentedSeq(items)
    s.fa.set_flow_style()
    return s


def aplicar(doc: DocumentoBOE, fase: str, ruta_registro: Path, ruta_circ: Path) -> Resumen:
    if fase not in ESTADO:
        raise ValueError("fase debe ser «presentadas» o «proclamadas»")
    y = _yaml()
    datos = y.load(ruta_registro.read_text(encoding="utf-8"))
    registro = RegistroCandidaturas.model_validate(datos)
    asignadas, sueltas = emparejar(doc, registro.candidaturas)
    por_id = {c["id"]: c for c in datos["candidaturas"]}
    res = Resumen(circunscripciones=len(doc.circunscripciones))

    def conv_de(entrada: CommentedMap) -> CommentedMap:
        convs = entrada.setdefault("convocatorias", CommentedMap())
        if not isinstance(convs.get(CONV), dict):
            convs[CONV] = CommentedMap()
        return convs[CONV]

    vistos: set[str] = set()
    for cid, listas_boe in asignadas.items():
        listas = {circ: c.siglas for c in listas_boe for circ in c.circunscripciones}
        c26 = conv_de(por_id[cid])
        c26["estado"] = ESTADO[fase]
        c26["circunscripciones"] = _flow(sorted(listas))
        c26["listas"] = CommentedMap(sorted(listas.items()))
        res.actualizadas.append(cid)
        vistos.add(cid)

    usados = set(por_id)
    for c in sorted(sueltas, key=lambda x: x.siglas):
        cid = slug(c.siglas) or slug(c.nombre)
        base, n = cid, 2
        while cid in usados:
            cid, n = f"{base}-{n}", n + 1
        usados.add(cid)
        nombre = titulo(c.nombre)
        tipo = (
            "agrupacion-electores"
            if re.search(r"agrupaci[oó]n de electores", c.nombre, re.I)
            else "coalicion"
            if re.search(r"coalici[oó]n", c.nombre, re.I)
            else "partido"
        )
        n_circ = len(c.circunscripciones)
        nueva = CommentedMap()
        nueva["id"] = cid
        nueva["nombre"] = nombre
        nueva["corto"] = c.siglas
        nueva["tipo"] = tipo
        nueva["ambito"] = (
            "estatal" if n_circ >= 26 else ("autonomico" if n_circ > 1 else "provincial")
        )
        nueva["color"] = COLOR_NEUTRO
        nueva["web"] = ""
        nueva["vigilar"] = _flow([])
        nueva["siglas_boe"] = _flow([re.escape(c.siglas)])
        nueva["nota"] = f"Alta automática desde {doc.identificador}"
        c26 = CommentedMap()
        c26["estado"] = ESTADO[fase]
        c26["circunscripciones"] = _flow(sorted(c.circunscripciones))
        c26["listas"] = CommentedMap((k, c.siglas) for k in sorted(c.circunscripciones))
        nueva["convocatorias"] = CommentedMap({CONV: c26})
        datos["candidaturas"].append(nueva)
        res.nuevas.append(cid)
        vistos.add(cid)

    if fase == "proclamadas":
        for entrada in datos["candidaturas"]:
            c26 = entrada.get("convocatorias", {}).get(CONV) or {}
            if entrada["id"] not in vistos and c26.get("estado") == "presentada":
                c26["estado"] = "no-proclamada"
                res.no_proclamadas.append(entrada["id"])

    datos["fase_inclusion"] = fase
    RegistroCandidaturas.model_validate(datos)  # el resultado sigue siendo válido
    with ruta_registro.open("w", encoding="utf-8", newline="\n") as f:
        y.dump(datos, f)

    circ = CommentedMap()
    circ["version"] = 1
    circ["fuente"] = doc.identificador
    circ["circunscripciones"] = [
        CommentedMap(id=k, nombre=v)
        for k, v in sorted(doc.circunscripciones.items(), key=lambda kv: slug(kv[1]))
    ]
    with ruta_circ.open("w", encoding="utf-8", newline="\n") as f:
        f.write(
            "# Circunscripciones al Congreso según el BOE (lo mantiene `vc boe-candidaturas`).\n"
        )
        y.dump(circ, f)
    return res
