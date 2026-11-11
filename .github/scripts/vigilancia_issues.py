"""Convierte las novedades de `vc vigilar --json` / `vc vigilar-boe --json` en issues de GitHub
(sin duplicar) y, si la variable del repo VIGILANCIA_AUTOINGESTA=1, lanza la ingesta en
borrador de los PDF oficiales.

Una issue por PDF oficial y por disposición del BOE; las noticias de una misma candidatura se
agrupan en una sola issue por ejecución, para no inundar el correo.

DRY_RUN=1 solo muestra qué haría, sin tocar GitHub (para probarlo en local).
"""

import json
import os
import subprocess
import sys

DRY_RUN = os.environ.get("DRY_RUN") == "1"


def gh(*args: str) -> str:
    return subprocess.run(["gh", *args], check=True, capture_output=True, text=True).stdout


def cuerpos_de_issues() -> str:
    """El cuerpo de todas las issues de vigilancia, abiertas y cerradas. Se compara en memoria:
    la búsqueda de GitHub admite 256 caracteres y las direcciones de Google News miden unos 800,
    así que `--search` nunca las encontraba y se creaban issues repetidas en cada ejecución."""
    if DRY_RUN:
        return ""
    salida = gh("issue", "list", "--label", "vigilancia", "--state", "all", "--limit", "5000",
                "--json", "body")
    return "\n".join(i.get("body") or "" for i in json.loads(salida))


def filtrar_nuevas(novedades: list[dict], conocidas: str) -> list[dict]:
    """Las novedades cuya URL no aparece ya en ninguna issue."""
    return [n for n in novedades if n["url"] not in conocidas]


def crear(titulo: str, cuerpo: str) -> None:
    if DRY_RUN:
        print(f"[dry-run] issue: {titulo}\n{cuerpo}\n")
        return
    gh("issue", "create", "--label", "vigilancia", "--title", titulo, "--body", cuerpo)


def agrupar_noticias(novedades: list[dict]) -> dict[str, list[dict]]:
    """Las noticias, por candidatura (en el orden en que llegan)."""
    grupos: dict[str, list[dict]] = {}
    for n in novedades:
        grupos.setdefault(n["candidatura"], []).append(n)
    return grupos


def issue_de_noticias(candidatura: str, noticias: list[dict]) -> tuple[str, str]:
    n = len(noticias)
    titulo = f"Noticias sobre el programa de {candidatura} ({n})"
    lineas = [
        f"**Candidatura:** `{candidatura}`",
        f"**{n} {'noticia nueva' if n == 1 else 'noticias nuevas'}** que mencionan su programa:",
        "",
    ]
    for x in noticias:
        lineas.append(f"- [{x['titulo'][:140]}]({x['url']}) · {x.get('fecha') or '—'}")
    lineas += [
        "",
        "Son noticias, no el documento. Si alguna anuncia que el programa ya está publicado, "
        "busca el PDF en su web y lanza Actions → «Ingestar programa» con esa URL (o pide a "
        "Claude `/ingest-program`). Si no, cierra la issue.",
    ]
    return titulo, "\n".join(lineas)


def main() -> None:
    datos = json.load(open(sys.argv[1], encoding="utf-8"))
    auto = os.environ.get("AUTO") == "1"
    if not DRY_RUN:
        gh("label", "create", "vigilancia", "--color", "FFE45C", "--force",
           "--description", "Posible programa o candidatura nueva (vigilancia automática)")

    creadas = 0
    nuevas = filtrar_nuevas(datos["novedades"], cuerpos_de_issues())

    for n in (x for x in nuevas if x["tipo"] == "boe"):
        crear(
            f"BOE: {n['titulo'][:110]}",
            "\n".join([
                f"Nueva disposición electoral en el BOE ({n.get('fecha')}):",
                "",
                n["url"],
                "",
                "Si son las candidaturas presentadas o proclamadas al Congreso, la vigilancia "
                "las carga sola en una rama `boe/<id>` y abre un PR (o una issue con el enlace "
                "para abrirlo). Si no aparece, lánzala a mano: Actions → «Vigilar BOE» → Run "
                "workflow con el identificador y la fase.",
            ]),
        )
        creadas += 1

    for n in (x for x in nuevas if x["tipo"] == "pdf-oficial"):
        crear(
            f"Posible programa nuevo: {n['candidatura']} · {n['titulo'][:70]}",
            "\n".join([
                f"**Candidatura:** `{n['candidatura']}`",
                "**Tipo:** 📄 PDF en su web",
                f"**Enlace:** {n['url']}",
                f"**Título:** {n['titulo']}",
                f"**Dominio oficial:** {'sí' if n.get('dominio_oficial') else 'no'}",
                "",
                "Si es el programa oficial: Actions → «Ingestar programa» → Run workflow con "
                "esta URL (o pide a Claude `/ingest-program`). Si no lo es, cierra la issue.",
            ]),
        )
        creadas += 1
        if auto and n.get("dominio_oficial") and not DRY_RUN:
            gh("workflow", "run", "ingest.yml", "-f", f"candidatura={n['candidatura']}",
               "-f", "convocatoria=generales-2026", "-f", f"url={n['url']}")

    for cand, noticias in agrupar_noticias([x for x in nuevas if x["tipo"] == "noticia"]).items():
        crear(*issue_de_noticias(cand, noticias))
        creadas += 1

    errores = ", ".join(datos["errores"]) or "—"
    print(f"{creadas} issues nuevas · {len(datos['novedades'])} novedades · no accesibles: {errores}")


if __name__ == "__main__":
    main()
