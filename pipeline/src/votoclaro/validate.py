"""Validación de `data/` para la CI y el hook Stop (spec 001; constitución II).

Falla si hay cualquier cita sin verificar, temas ausentes, límites de simetría superados,
lectura fácil sin validar o registros inconsistentes.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from pydantic import ValidationError

from .fetch import sha256_file
from .models import (
    MAX_PROPUESTAS,
    MAX_RESUMEN_FRASES,
    MAX_RESUMEN_PALABRAS,
    Analisis,
)
from .paths import Paths
from .registry import iter_analyses, load_candidaturas, load_sources, load_topics
from .textnorm import word_count


@dataclass
class Informe:
    errores: list[str] = field(default_factory=list)
    avisos: list[str] = field(default_factory=list)
    analisis: int = 0
    citas: int = 0

    @property
    def ok(self) -> bool:
        return not self.errores


def _check_registries(paths: Paths, inf: Informe) -> tuple[set[str], set[str]]:
    try:
        cands = load_candidaturas(paths)
        topics = load_topics(paths)
        sources = load_sources(paths)
    except (ValidationError, OSError) as e:
        inf.errores.append(f"Registro inválido: {e}")
        return set(), set()

    ids = [c.id for c in cands.candidaturas]
    if len(ids) != len(set(ids)):
        inf.errores.append("candidaturas.yaml: ids duplicados")
    for c in cands.candidaturas:
        for conv, cc in c.convocatorias.items():
            if conv not in sources.convocatorias:
                inf.errores.append(f"candidaturas.yaml: {c.id} usa convocatoria desconocida {conv}")
            if cc.dentro_de and cc.dentro_de not in ids:
                inf.errores.append(f"candidaturas.yaml: {c.id}.dentro_de={cc.dentro_de} no existe")

    tids = [t.id for t in topics.temas]
    if len(tids) != len(set(tids)):
        inf.errores.append("topics.yaml: ids duplicados")

    for conv, cf in sources.convocatorias.items():
        for cand, f in cf.programas.items():
            if cand not in ids:
                inf.errores.append(f"sources.yaml: {conv}/{cand} no está en candidaturas.yaml")
            doc = paths.data / f.fichero
            if not doc.exists():
                inf.errores.append(f"sources.yaml: falta el fichero {f.fichero}")
            elif sha256_file(doc) != f.sha256:
                inf.errores.append(f"sources.yaml: el hash de {f.fichero} no coincide")
    return set(ids), set(tids)


def _check_analysis(name: str, a: Analisis, topic_ids: set[str], inf: Informe) -> None:
    missing = topic_ids - set(a.temas)
    if missing:
        inf.errores.append(f"{name}: faltan temas {sorted(missing)}")
    extra = set(a.temas) - topic_ids
    if extra:
        inf.errores.append(f"{name}: temas desconocidos {sorted(extra)}")

    for cid, c in a.citas.items():
        inf.citas += 1
        if not c.verificada:
            inf.errores.append(f"{name}: cita {cid} sin verificar")
        elif not c.resaltada:
            inf.avisos.append(f"{name}: cita {cid} verificada pero sin resaltado (p. {c.pagina})")

    for tid, t in a.temas.items():
        where = f"{name} · {tid}"
        refs = [c for af in [*t.resumen, *t.propuestas] for c in af.citas]
        for ref in refs:
            if ref not in a.citas:
                inf.errores.append(f"{where}: referencia a cita inexistente {ref}")
        if not t.menciona:
            if t.resumen or t.propuestas:
                inf.errores.append(f"{where}: menciona=false pero tiene contenido")
            if not (t.red_seguridad and t.red_seguridad.ejecutada):
                inf.errores.append(f"{where}: menciona=false sin red de seguridad ejecutada")
            continue
        if not t.resumen:
            inf.errores.append(f"{where}: menciona=true sin resumen")
        if len(t.resumen) > MAX_RESUMEN_FRASES:
            inf.errores.append(
                f"{where}: resumen con {len(t.resumen)} frases (máx. {MAX_RESUMEN_FRASES})"
            )
        palabras = sum(word_count(f.texto) for f in t.resumen)
        if palabras > MAX_RESUMEN_PALABRAS:
            inf.errores.append(
                f"{where}: resumen de {palabras} palabras (máx. {MAX_RESUMEN_PALABRAS})"
            )
        if len(t.propuestas) > MAX_PROPUESTAS:
            inf.errores.append(f"{where}: {len(t.propuestas)} propuestas (máx. {MAX_PROPUESTAS})")
        lf = t.lectura_facil
        if lf is None:
            inf.errores.append(f"{where}: falta la lectura fácil")
            continue
        if not (lf.legibilidad and lf.legibilidad.ok):
            inf.errores.append(f"{where}: la lectura fácil no supera la validación automática")
        if lf.fiel is False:
            inf.errores.append(f"{where}: la lectura fácil no es fiel a la versión normal")
        base = set(refs)
        lf_refs = {c for af in [*lf.resumen, *lf.propuestas] for c in af.citas}
        if not lf_refs <= base:
            inf.errores.append(
                f"{where}: la lectura fácil cita fuentes que no están en la versión normal"
            )


def validate(paths: Paths) -> Informe:
    inf = Informe()
    cand_ids, topic_ids = _check_registries(paths, inf)
    try:
        for p, a in iter_analyses(paths):
            inf.analisis += 1
            name = paths.rel(p)
            if a.candidatura not in cand_ids:
                inf.errores.append(f"{name}: candidatura {a.candidatura} no registrada")
            if p.stem != a.candidatura or p.parent.name != a.convocatoria:
                inf.errores.append(f"{name}: la ruta no coincide con convocatoria/candidatura")
            _check_analysis(name, a, topic_ids, inf)
    except ValidationError as e:
        inf.errores.append(f"Análisis con esquema inválido: {e}")
    return inf
