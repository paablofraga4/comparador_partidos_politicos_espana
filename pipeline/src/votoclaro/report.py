"""Informe de revisión en Markdown para el PR de cada ingesta (spec 001, HU-1.6)."""

from __future__ import annotations

import re
from statistics import mean

from .models import Analisis, Taxonomia
from .textnorm import word_count

# Léxico valorativo (constitución I.3). Avisa; no bloquea: decide el humano en el PR.
VALORATIVOS = [
    "ambicios",
    "radical",
    "polémic",
    "populis",
    "irrealista",
    "valiente",
    "extrem",
    "históric",
    "contundente",
    "drástic",
    "revolucionari",
    "audaz",
    "tímid",
    "insuficiente",
    "excesiv",
    "apenas",
    "incluso",
    "sorprendente",
    "controvertid",
    "agresiv",
    "demagóg",
    "acertad",
    "ideológic",
    "sectari",
    "progresista",
    "conservador",
    "ultra",
    "facha",
    "rojo",
]
_VAL = re.compile(r"\b(" + "|".join(VALORATIVOS) + r")\w*", re.IGNORECASE)


def neutrality_flags(a: Analisis) -> list[str]:
    flags = []
    for tid, t in a.temas.items():
        items = [("resumen", f.texto) for f in t.resumen] + [(p.id, p.texto) for p in t.propuestas]
        for where, text in items:
            for m in _VAL.finditer(text):
                flags.append(f"`{tid}` · {where}: «{m.group(0)}» → «{text[:100]}»")
    return flags


def _ref(a: Analisis, cid: str, doc: str) -> str:
    c = a.citas[cid]
    return f"[p.{c.pagina_impresa or c.pagina}]({doc}#page={c.pagina})"


def render(
    a: Analisis,
    topics: Taxonomia,
    peers: list[Analisis] | None = None,
    base_url: str = "../data/documents",
) -> str:
    names = {t.id: t.nombre for t in topics.temas}
    total = len(a.citas)
    verified = sum(c.verificada for c in a.citas.values())
    highlighted = sum(c.resaltada for c in a.citas.values())
    mentions = [tid for tid, t in a.temas.items() if t.menciona]
    no_mention = [tid for tid, t in a.temas.items() if not t.menciona]
    g = a.generado
    coste = f"{g.coste_usd:.2f} USD" if g.coste_usd is not None else "sin precio configurado"
    lines = [
        f"# Informe de revisión · {a.candidatura} · {a.convocatoria}",
        "",
        f"- Documento: `{a.documento.id}` · {a.documento.paginas} págs · "
        f"idioma `{a.documento.idioma}` · sha256 `{a.documento.sha256[:12]}`",
        f"- Modelo: `{g.modelo}` · prompt `{g.prompt}` · tokens: {g.tokens_entrada:,} entrada "
        f"({g.tokens_cache:,} en caché) / {g.tokens_salida:,} salida · coste: {coste}",
        f"- Citas: **{verified}/{total} verificadas** · {highlighted}/{total} con resaltado",
        f"- Temas: {len(mentions)} con contenido · {len(no_mention)} «no menciona»",
        "",
    ]

    if peers:
        lines += [
            "## Simetría (frente a la media de la convocatoria)",
            "",
            "| Tema | Propuestas | Media | Palabras resumen | Media |",
            "|---|---|---|---|---|",
        ]
        for tid, t in a.temas.items():
            others = [p.temas[tid] for p in peers if tid in p.temas and p.temas[tid].menciona]
            if not t.menciona or not others:
                continue
            mp = mean(len(o.propuestas) for o in others)
            mw = mean(sum(word_count(f.texto) for f in o.resumen) for o in others)
            np_, nw = len(t.propuestas), sum(word_count(f.texto) for f in t.resumen)
            flag = " ⚠" if (mp and abs(np_ - mp) / mp > 0.4) else ""
            lines.append(f"| {names.get(tid, tid)} | {np_}{flag} | {mp:.1f} | {nw} | {mw:.0f} |")
        lines.append("")

    flags = neutrality_flags(a)
    lines += ["## Avisos de neutralidad", ""]
    lines += [f"- {f}" for f in flags] or ["Ninguno."]
    lines.append("")

    lines += ["## Incidencias", ""]
    lines += [f"- {i}" for i in a.incidencias] or ["Ninguna."]
    lines.append("")

    lines += ["## «No menciona» (revisar)", ""]
    for tid in no_mention:
        rs = a.temas[tid].red_seguridad
        frag = ", ".join(rs.fragmentos_revisados) if rs and rs.fragmentos_revisados else "—"
        lines.append(
            f"- **{names.get(tid, tid)}** · fragmentos revisados por la red de seguridad: {frag}"
        )
    if not no_mention:
        lines.append("Ninguno.")
    lines.append("")

    lines += ["## Lectura fácil", ""]
    for tid in mentions:
        lf = a.temas[tid].lectura_facil
        if lf and lf.legibilidad:
            ok = "✓" if lf.legibilidad.ok and lf.fiel is not False else "✗"
            lines.append(
                f"- {ok} {names.get(tid, tid)}: INFLESZ {lf.legibilidad.inflesz} · "
                f"frase más larga {lf.legibilidad.max_palabras_frase} palabras"
                + (f" · {'; '.join(lf.legibilidad.avisos[:3])}" if lf.legibilidad.avisos else "")
            )
    lines.append("")

    doc = f"{base_url}/{a.convocatoria}/{a.candidatura}.pdf"
    lines += ["## Contenido", ""]
    for tid in mentions:
        t = a.temas[tid]
        lines += [f"### {names.get(tid, tid)}", ""]
        for f in t.resumen:
            refs = " ".join(_ref(a, c, doc) for c in f.citas)
            lines.append(f"> {f.texto} {refs}")
        lines.append("")
        for p in t.propuestas:
            c0 = a.citas[p.citas[0]]
            lines.append(
                f"- **{p.texto}** _({p.subtema})_ — [p.{c0.pagina_impresa or c0.pagina}]"
                f"({doc}#page={c0.pagina}): «{c0.literal[:160]}»"
            )
        lines.append("")
    return "\n".join(lines)
