"""Carga las candidaturas al Congreso que publica el BOE (spec 001, fase BOE; tarea T-503).

Si en las novedades de `vc vigilar-boe --json` aparecen las «Candidaturas presentadas» o
«proclamadas» (o se pasa BOE_ID y FASE a mano), aplica `vc boe-candidaturas` sobre una rama
`boe/<id>`, la valida y abre un PR para revisión humana. Si el repositorio no deja a Actions
abrir PRs, sube la rama y abre una issue con el enlace para crearlo en un clic.

DRY_RUN=1 solo muestra qué haría (para probarlo en local).
"""

import json
import os
import re
import subprocess
import sys
from pathlib import Path

# El BOE de 2023 escribió «para la elecciones» en las proclamadas: vale con y sin «s»
PATRON = re.compile(
    r"^(BOE-A-\d{4}-\d+) · Candidaturas (presentadas|proclamadas) para las? elecciones al Congreso",
    re.I,
)


def documentos(novedades: list[dict]) -> list[tuple[str, str]]:
    """(identificador, fase) de los documentos de candidaturas, presentadas antes que proclamadas."""
    vistos: dict[str, str] = {}
    for n in novedades:
        m = PATRON.match(n.get("titulo", ""))
        if m:
            vistos[m.group(1)] = m.group(2).lower()
    return sorted(vistos.items(), key=lambda d: (d[1] != "presentadas", d[0]))


def sh(*args: str, cwd: str | None = None, check: bool = True) -> subprocess.CompletedProcess:
    return subprocess.run(args, cwd=cwd, check=check, capture_output=True, text=True)


def cargar(ident: str, fase: str) -> None:
    rama = f"boe/{ident}"
    if sh("git", "ls-remote", "--exit-code", "--heads", "origin", rama, check=False).returncode == 0:
        print(f"· {rama} ya existe: no se repite")
        return
    sh("git", "switch", "-c", rama)
    informe = Path(os.environ.get("RUNNER_TEMP", ".")) / f"{ident}.md"
    sh("uv", "run", "vc", "boe-candidaturas", "--id", ident, "--fase", fase,
       "--informe", str(informe), cwd="pipeline")
    if not sh("git", "status", "--porcelain", "data").stdout.strip():
        print(f"· {ident}: el registro ya estaba al día")
        sh("git", "switch", "main")
        return
    validacion = sh("uv", "run", "vc", "validate", cwd="pipeline", check=False)
    sh("git", "add", "data/candidaturas.yaml", "data/circunscripciones.yaml")
    sh("git", "commit", "-m", f"data(boe): candidaturas {fase} · {ident}")
    sh("git", "push", "-u", "origin", rama)

    estado = (
        "✓ `vc validate` correcto."
        if validacion.returncode == 0
        else f"⚠️ `vc validate` falla:\n\n```\n{(validacion.stdout + validacion.stderr)[-3000:]}\n```"
    )
    cuerpo = "\n\n".join([
        informe.read_text(encoding="utf-8"),
        estado,
        "_Abierto por la vigilancia del BOE (T-503). Los PR que abre Actions no lanzan la CI: "
        "ciérralo y vuelve a abrirlo para que se ejecute._",
    ])
    titulo = f"Candidaturas {fase} del BOE · {ident}"
    pr = sh("gh", "pr", "create", "--base", "main", "--head", rama, "--title", titulo,
            "--body", cuerpo, check=False)
    if pr.returncode == 0:
        print(f"✓ PR abierto: {pr.stdout.strip()}")
    else:
        # Ajuste del repositorio: «Allow GitHub Actions to create and approve pull requests»
        url = f"https://github.com/{os.environ.get('GITHUB_REPOSITORY', '')}/compare/main...{rama}?expand=1"
        sh("gh", "issue", "create", "--label", "vigilancia",
           "--title", f"BOE: candidaturas {fase} listas para revisar · {ident}",
           "--body", f"La rama `{rama}` ya tiene las candidaturas cargadas.\n\n"
                     f"**Abre el PR aquí:** {url}\n\n{cuerpo}")
        print(f"✓ rama {rama} subida; issue con el enlace para abrir el PR")
    sh("git", "switch", "main")


def main() -> None:
    manual = os.environ.get("BOE_ID", "").strip()
    if manual:
        docs = [(manual, os.environ.get("FASE", "presentadas").strip())]
    else:
        datos = json.load(open(sys.argv[1], encoding="utf-8"))
        docs = documentos(datos.get("novedades", []))
    if not docs:
        print("Sin candidaturas del Congreso en el BOE")
        return
    for ident, fase in docs:
        if os.environ.get("DRY_RUN") == "1":
            print(f"(prueba) cargaría {ident} como {fase}")
        else:
            cargar(ident, fase)


if __name__ == "__main__":
    main()
