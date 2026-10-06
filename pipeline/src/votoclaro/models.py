"""Esquemas de datos (fuente de verdad del contrato entre pipeline y web).

`vc schema` exporta el JSON Schema de `Analisis` para que la web genere sus tipos.
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

# Límites de simetría (spec 001, HU-1.3): iguales para todas las candidaturas.
MAX_RESUMEN_FRASES = 3
MAX_RESUMEN_PALABRAS = 60
MAX_PROPUESTAS = 8

EstadoPrograma = Literal["pendiente", "publicado", "analizado", "aprobado"]


class _Model(BaseModel):
    model_config = ConfigDict(extra="forbid")


# --- Registros -----------------------------------------------------------------------------


class Tema(_Model):
    id: str
    nombre: str
    icono: str
    descripcion: str
    subtemas: list[str]


class Taxonomia(_Model):
    version: int
    temas: list[Tema]


class CandidaturaEnConvocatoria(_Model):
    programa_propio: bool | Literal["por-verificar"] | None = None
    dentro_de: str | None = None
    estado: Literal["provisional", "presentada", "proclamada", "no-proclamada"] | None = None
    circunscripciones: list[str] = Field(default_factory=list)
    # Siglas con que concurre en cada circunscripción (p. ej. barcelona: PSC), según el BOE
    listas: dict[str, str] = Field(default_factory=dict)


class Candidatura(_Model):
    id: str
    nombre: str
    corto: str
    tipo: Literal["partido", "coalicion", "agrupacion-electores"]
    ambito: Literal["estatal", "autonomico", "provincial"]
    territorio: str | None = None
    color: str = Field(pattern=r"^#[0-9A-Fa-f]{6}$")
    web: str
    vigilar: list[str] = Field(default_factory=list)
    # Expresiones regulares de las siglas con que concurre en el BOE (p. ej. el PSOE como PSC)
    siglas_boe: list[str] = Field(default_factory=list)
    incluir: Literal["siempre", "si-concurre-por-separado"] | None = None
    nota: str | None = None
    miembros: list[str] = Field(default_factory=list)
    convocatorias: dict[str, CandidaturaEnConvocatoria]


class RegistroCandidaturas(_Model):
    version: int
    fase_inclusion: Literal["provisional", "presentadas", "proclamadas"]
    candidaturas: list[Candidatura]

    def get(self, cand_id: str) -> Candidatura:
        for c in self.candidaturas:
            if c.id == cand_id:
                return c
        raise KeyError(f"Candidatura desconocida: {cand_id!r} (ver data/candidaturas.yaml)")


class Fuente(_Model):
    url: str
    url_archivo: str | None = None
    fichero: str
    sha256: str
    descargado: datetime
    origen: Literal["pdf", "html"] = "pdf"
    paginas: int
    idioma: str | None = None
    estado: EstadoPrograma = "publicado"
    nota: str | None = None


class ConvocatoriaFuentes(_Model):
    fecha: date
    programas: dict[str, Fuente] = Field(default_factory=dict)


class RegistroFuentes(_Model):
    version: int
    convocatorias: dict[str, ConvocatoriaFuentes]


# --- Texto extraído ------------------------------------------------------------------------


class Bloque(_Model):
    bbox: tuple[float, float, float, float]
    texto: str
    size: float
    bold: bool
    titulo: int | None = None  # nivel de encabezado (1..3) si lo es
    seccion: list[str] = Field(default_factory=list)


class Pagina(_Model):
    pagina: int  # 1-based
    etiqueta: str | None = None
    ancho: float
    alto: float
    texto: str
    bloques: list[Bloque]


class DocumentoMeta(_Model):
    id: str
    convocatoria: str
    candidatura: str
    sha256: str
    paginas: int
    idioma: str
    ocr: bool = False
    caracteres: int
    toc: list[tuple[int, str, int]] = Field(default_factory=list)


class Chunk(_Model):
    id: str
    convocatoria: str
    candidatura: str
    pagina: int
    etiqueta: str | None = None
    seccion: list[str] = Field(default_factory=list)
    bbox: tuple[float, float, float, float]
    texto: str
    contexto: str  # cabecera contextual para recuperación (spec 001, RAG)
    hash: str


# --- Análisis ------------------------------------------------------------------------------


class Rect(_Model):
    pagina: int
    r: tuple[float, float, float, float]  # normalizado 0..1 respecto a la página


class Cita(_Model):
    chunk: str
    pagina: int
    pagina_impresa: str | None = None
    literal: str
    idioma: str = "es"
    traduccion: str | None = None
    rects: list[Rect] = Field(default_factory=list)
    verificada: bool = False
    resaltada: bool = False


class Afirmacion(_Model):
    texto: str
    citas: list[str] = Field(min_length=1)


class Propuesta(Afirmacion):
    id: str
    subtema: str


class Legibilidad(_Model):
    inflesz: float
    max_palabras_frase: int
    ok: bool
    avisos: list[str] = Field(default_factory=list)


class LecturaFacil(_Model):
    resumen: list[Afirmacion] = Field(default_factory=list)
    propuestas: list[Propuesta] = Field(default_factory=list)
    legibilidad: Legibilidad | None = None
    fiel: bool | None = None
    observaciones: list[str] = Field(default_factory=list)  # avisos leves del juez


class RedSeguridad(_Model):
    ejecutada: bool
    fragmentos_revisados: list[str] = Field(default_factory=list)
    reanalizado: bool = False


class AnalisisTema(_Model):
    menciona: bool
    resumen: list[Afirmacion] = Field(default_factory=list)
    propuestas: list[Propuesta] = Field(default_factory=list)
    lectura_facil: LecturaFacil | None = None
    red_seguridad: RedSeguridad | None = None


class DocumentoRef(_Model):
    id: str
    sha256: str
    paginas: int
    idioma: str


class Generado(_Model):
    fecha: datetime
    modelo: str
    modelo_lectura_facil: str | None = None
    prompt: str
    tokens_entrada: int = 0
    tokens_cache: int = 0
    tokens_salida: int = 0
    coste_usd: float | None = None


class Analisis(_Model):
    convocatoria: str
    candidatura: str
    estado: Literal["borrador", "aprobado"] = "borrador"
    aprobado_en: datetime | None = None
    documento: DocumentoRef
    generado: Generado
    temas: dict[str, AnalisisTema]
    citas: dict[str, Cita]
    incidencias: list[str] = Field(default_factory=list)
