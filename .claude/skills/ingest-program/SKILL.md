---
name: ingest-program
description: Runbook para añadir o actualizar el programa electoral de un partido (p. ej. cuando publica su programa del 29N y sustituye al de 2023). Úsala cuando el usuario diga "ha salido el programa de X", "actualiza el programa de X", "/ingest-program" o haya que re-analizar un partido.
argument-hint: "<partido> <convocatoria> <url-del-pdf>"
---

# Ingestar un programa electoral

Flujo de la spec 001 (HU-1.7). Estados: `pendiente → publicado → analizado → aprobado`.
Solo `aprobado` se ve en la web; hasta entonces sigue el programa anterior con su aviso.

> Los comandos `cmp …` se construyen en la fase F1. Antes de eso, este runbook es la guía.

## 0. Comprobaciones previas
- El partido existe en `data/parties.yaml` y la candidatura de esa convocatoria está
  actualizada (coaliciones). Si es un partido nuevo, añádelo respetando el criterio de
  inclusión (constitución I.6) y confírmalo con el usuario.
- La URL es del **dominio oficial del partido** (o de una fuente oficial equivalente). Si
  solo existe en prensa, avisa al usuario antes de seguir.
- Si hay versión en castellano y en otra lengua, usa la castellana y registra la otra.

## 1. Ejecutar
Opción A — GitHub (también desde el móvil): Actions → **Ingestar programa** → Run workflow
(partido, convocatoria, URL). Abre un PR automáticamente.

Opción B — local:
```bash
git switch -c ingest/<convocatoria>-<partido>
cd pipeline
uv run cmp fetch   --partido <id> --convocatoria <conv> --url "<url>"
uv run cmp extract --partido <id> --convocatoria <conv>
uv run cmp analyze --partido <id> --convocatoria <conv>
uv run cmp verify  --partido <id> --convocatoria <conv>
uv run cmp report  --partido <id> --convocatoria <conv> > ../report.md
uv run cmp validate
```
Después: commit, push y `gh pr create --title "Programa <conv> · <Partido>" --body-file report.md`.

## 2. Revisar (antes de aprobar)
- Lanza los agentes `grounding-auditor` y `neutrality-reviewer` sobre el JSON del análisis.
- Lee el informe: temas sin mención (¿de verdad no lo menciona? búscalo en el texto),
  citas descartadas, avisos de neutralidad, coste.
- Muestrea al menos 10 citas abriendo el PDF en la página indicada.
- Si hay errores: corrige vía re-análisis del tema (`cmp analyze --tema <id> --force`), no
  editando literales a mano.

## 3. Aprobar
- Cambia `estado: aprobado` en el JSON (o `cmp approve`) dentro del PR.
- El usuario hace merge. Railway despliega solo. Comprueba en producción: la tarjeta del
  partido ya no muestra el aviso de 2023 y las citas abren la página correcta.
- La página de metodología refleja la fecha de aprobación automáticamente.

## Nunca
- Aprobar con citas no verificadas (la CI lo impide; no lo sortees).
- Mezclar dos partidos en un mismo PR.
- Sobrescribir un análisis aprobado sin `--force` explícito y sin decírselo al usuario.
