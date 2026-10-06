"""Convierte las novedades de `vc vigilar --json` / `vc vigilar-boe --json` en issues de GitHub
(sin duplicar) y, si la variable del repo VIGILANCIA_AUTOINGESTA=1, lanza la ingesta en
borrador de los PDF oficiales."""

import json
import os
import subprocess
import sys


def gh(*args: str) -> str:
    return subprocess.run(["gh", *args], check=True, capture_output=True, text=True).stdout


def ya_existe(url: str) -> bool:
    salida = gh("issue", "list", "--label", "vigilancia", "--state", "all", "--limit", "5",
                "--search", f'"{url}" in:body', "--json", "number")
    return bool(json.loads(salida))


datos = json.load(open(sys.argv[1], encoding="utf-8"))
auto = os.environ.get("AUTO") == "1"
gh("label", "create", "vigilancia", "--color", "FFE45C", "--force",
   "--description", "Posible programa o candidatura nueva (vigilancia automática)")

creadas = 0
for n in datos["novedades"]:
    if ya_existe(n["url"]):
        continue
    if n["tipo"] == "boe":
        titulo = f"BOE: {n['titulo'][:110]}"
        cuerpo = "\n".join([
            f"Nueva disposición electoral en el BOE ({n.get('fecha')}):",
            "",
            n["url"],
            "",
            "Si son candidaturas presentadas o proclamadas, hay que cargarlas en "
            "`data/candidaturas.yaml` (tarea T-503) y pasar `fase_inclusion` a la fase que toque.",
        ])
    else:
        tipo = "📄 PDF en su web" if n["tipo"] == "pdf-oficial" else "📰 Noticia"
        titulo = f"Posible programa nuevo: {n['candidatura']} · {n['titulo'][:70]}"
        cuerpo = "\n".join([
            f"**Candidatura:** `{n['candidatura']}`",
            f"**Tipo:** {tipo}",
            f"**Enlace:** {n['url']}",
            f"**Título:** {n['titulo']}",
            f"**Fecha:** {n.get('fecha') or '—'}",
            f"**Dominio oficial:** {'sí' if n.get('dominio_oficial') else 'no'}",
            "",
            "Si es el programa oficial: Actions → «Ingestar programa» → Run workflow con esta URL "
            "(o pide a Claude `/ingest-program`). Si no lo es, cierra la issue.",
        ])
    gh("issue", "create", "--label", "vigilancia", "--title", titulo, "--body", cuerpo)
    creadas += 1
    if auto and n["tipo"] == "pdf-oficial" and n.get("dominio_oficial"):
        gh("workflow", "run", "ingest.yml", "-f", f"candidatura={n['candidatura']}",
           "-f", "convocatoria=generales-2026", "-f", f"url={n['url']}")

errores = ", ".join(datos["errores"]) or "—"
print(f"{creadas} issues nuevas · {len(datos['novedades'])} novedades · no accesibles: {errores}")
