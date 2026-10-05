"""Rutas del repositorio. `Paths` permite apuntar a otro directorio de datos (tests)."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import dotenv_values, load_dotenv

ROOT = Path(__file__).resolve().parents[3]

# Carga .env de la raíz del repo si existe. Nunca se imprimen sus valores.
load_dotenv(ROOT / ".env")
# Configuración no secreta de modelos (versionada). Un valor NO vacío en .env tiene prioridad.
for _k, _v in dotenv_values(ROOT / "config" / "models.env").items():
    if _v and not os.environ.get(_k):
        os.environ[_k] = _v


@dataclass(frozen=True)
class Paths:
    data: Path

    @classmethod
    def default(cls) -> Paths:
        return cls(Path(os.environ.get("VC_DATA_DIR", ROOT / "data")))

    @property
    def candidaturas(self) -> Path:
        return self.data / "candidaturas.yaml"

    @property
    def topics(self) -> Path:
        return self.data / "topics.yaml"

    @property
    def sources(self) -> Path:
        return self.data / "sources.yaml"

    def document(self, conv: str, cand: str) -> Path:
        return self.data / "documents" / conv / f"{cand}.pdf"

    def pages(self, conv: str, cand: str) -> Path:
        return self.data / "extracted" / conv / f"{cand}.pages.jsonl"

    def chunks(self, conv: str, cand: str) -> Path:
        return self.data / "extracted" / conv / f"{cand}.chunks.jsonl"

    def meta(self, conv: str, cand: str) -> Path:
        return self.data / "extracted" / conv / f"{cand}.meta.json"

    def analysis(self, conv: str, cand: str) -> Path:
        return self.data / "analyses" / conv / f"{cand}.json"

    def rel(self, p: Path) -> str:
        """Ruta relativa a la carpeta de datos, con barras normales (portátil)."""
        return p.relative_to(self.data).as_posix()
