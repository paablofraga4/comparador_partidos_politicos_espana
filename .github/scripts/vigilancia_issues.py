"""Convierte las novedades de `vc vigilar --json` en issues de GitHub (sin duplicar) y, si la
variable del repo VIGILANCIA_AUTOINGESTA=1, lanza la ingesta en borrador de los PDF oficiales."""

import json
import os
import subprocess
import sys


def gh(*args: str) -> str:
    return subprocess.run(["gh", *args], check=True, capture_output=True, text=True).stdout


datos = json.load(open(sys.argv[1], encoding="utf-8"))
auto = os.environ.get("AUTO") == "1"
gh("label", "create", "vigilancia", "--color", "FFE45C", "--force",
   "--description", "Posible programa o candidatura nueva (vigilancia automática)")

creadas = 0
for n in datos["novedades"]:
    ya = gh("issue", "list", "--label", "vigilancia", "--state", "all", "--limit", "5",
            "--search", f'"{n["url"]}" in:body', "--json", "number")
    if json.loads(ya):
        continue
    tipo = "📄 PDF en su web" if n["tipo"] == "pdf-oficial" else "📰 Noticia"
    cuerpo = (
        f"**Candidatura:** `{n['candidatura']}`\n**Tipo:** {tipo}\n**Enlace:** {n['url']}\n"
        f"**Título:** {n['titulo']}\n**Fecha:** {n.get('fecha') or '—'}\n"
        f"**Dominio oficial:** {'sí' if n.get('dominio_oficial') else 'no'}\n\n"
        "Si es el programa oficial: Actions → «Ingestar programa» → Run workflow con esta URL "
        "(o pide a Claude `/ingest-program`). Si no lo es, cierra la issue."
    )
    gh("issue", "create", "--label", "vigilancia",
       "--title", f"Posible programa nuevo: {n['candidatura']} · {n['titulo'][:70]}",
       "--body", cuerpo)
    creadas += 1
    if auto and n["tipo"] == "pdf-oficial" and n.get("dominio_oficial"):
        gh("workflow", "run", "ingest.yml", "-f", f"candidatura={n['candidatura']}",
           "-f", "convocatoria=generales-2026", "-f", f"url={n['url']}")

print(f"{creadas} issues nuevas · {len(datos['novedades'])} novedades · "
      f"{len(datos['errores'])} webs no accesibles: {', '.join(datos['errores']) or '—'}")
