"""Lectura y escritura de los registros YAML y los ficheros JSON/JSONL de `data/`."""

from __future__ import annotations

import json
from collections.abc import Iterable
from pathlib import Path

import yaml
from pydantic import BaseModel

from .models import (
    Analisis,
    Chunk,
    ConvocatoriaFuentes,
    Pagina,
    RegistroCandidaturas,
    RegistroFuentes,
    Taxonomia,
)
from .paths import Paths

_SOURCES_HEADER = """\
# Fuentes de cada programa. Lo mantiene `vc fetch`; se puede editar a mano la URL o la nota.
# estado: pendiente | publicado | analizado | aprobado   (spec 001, HU-1.7)
# Solo se aceptan URLs del dominio oficial de la candidatura (o fuente oficial equivalente).
"""

CONVOCATORIAS = {"generales-2023": "2023-07-23", "generales-2026": "2026-11-29"}


def _read_yaml(path: Path) -> dict:
    with path.open(encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def load_candidaturas(paths: Paths) -> RegistroCandidaturas:
    return RegistroCandidaturas.model_validate(_read_yaml(paths.candidaturas))


def load_topics(paths: Paths) -> Taxonomia:
    return Taxonomia.model_validate(_read_yaml(paths.topics))


def load_sources(paths: Paths) -> RegistroFuentes:
    if not paths.sources.exists():
        return RegistroFuentes(
            version=1,
            convocatorias={k: ConvocatoriaFuentes(fecha=v) for k, v in CONVOCATORIAS.items()},
        )
    return RegistroFuentes.model_validate(_read_yaml(paths.sources))


def save_sources(paths: Paths, reg: RegistroFuentes) -> None:
    data = reg.model_dump(mode="json", exclude_none=True)
    paths.sources.parent.mkdir(parents=True, exist_ok=True)
    with paths.sources.open("w", encoding="utf-8", newline="\n") as f:
        f.write(_SOURCES_HEADER)
        yaml.safe_dump(data, f, allow_unicode=True, sort_keys=False, width=100)


def write_jsonl(path: Path, items: Iterable[BaseModel]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as f:
        for it in items:
            f.write(it.model_dump_json(exclude_none=True) + "\n")


def read_jsonl[M: BaseModel](path: Path, model: type[M]) -> list[M]:
    with path.open(encoding="utf-8") as f:
        return [model.model_validate_json(line) for line in f if line.strip()]


def write_json(path: Path, obj: BaseModel) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(obj.model_dump(mode="json", exclude_none=True), ensure_ascii=False, indent=2)
    path.write_text(text + "\n", encoding="utf-8", newline="\n")


def load_pages(paths: Paths, conv: str, cand: str) -> list[Pagina]:
    return read_jsonl(paths.pages(conv, cand), Pagina)


def load_chunks(paths: Paths, conv: str, cand: str) -> list[Chunk]:
    return read_jsonl(paths.chunks(conv, cand), Chunk)


def load_analysis(paths: Paths, conv: str, cand: str) -> Analisis:
    return Analisis.model_validate_json(paths.analysis(conv, cand).read_text(encoding="utf-8"))


def iter_analyses(paths: Paths) -> Iterable[tuple[Path, Analisis]]:
    base = paths.data / "analyses"
    if not base.exists():
        return
    for p in sorted(base.glob("*/*.json")):
        yield p, Analisis.model_validate_json(p.read_text(encoding="utf-8"))
