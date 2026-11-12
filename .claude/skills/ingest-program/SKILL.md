---
name: ingest-program
description: Runbook para añadir o actualizar el programa electoral de un partido (p. ej. cuando publica su programa del 29N y sustituye al de 2023). Úsala cuando el usuario diga "ha salido el programa de X", "actualiza el programa de X", "/ingest-program" o haya que re-analizar un partido.
argument-hint: "<partido> <convocatoria> <url-del-pdf>"
---

# Ingestar un programa electoral

Flujo de la spec 001 (HU-1.7). Estados: `pendiente → publicado → analizado → aprobado`.
Solo `aprobado` se ve en la web; hasta entonces sigue el programa anterior con su aviso.

> Los comandos `vc …` se construyen en la fase F1. Antes de eso, este runbook es la guía.

## 0. Comprobaciones previas
- **¿Es principal?** (constitución I.6, spec 008) Solo las principales se analizan con IA. De
  las demás, haz `vc fetch` y `vc extract` (sin `analyze`): la web mostrará «Ha publicado su
  programa del 29N» con el documento. `vc analyze` se niega con una no principal salvo
  `--forzar-no-principal`, que solo se usa si el titular lo pide expresamente.
- Si la web del partido bloquea a los robots (VOX, Podemos), no lo fuerces: el titular descarga
  el PDF en su navegador y se registra con `vc fetch --url <oficial> --archivo <pdf>`.
- La candidatura existe en `data/candidaturas.yaml` con su estado para esa convocatoria.
  Si es nueva (coalición, agrupación de electores…), solo se publica si cumple el criterio
  de inclusión (constitución I.6: fase provisional o aparece en el BOE); puedes ingestarla
  antes en borrador para tenerla lista.
- La URL es del **dominio oficial del partido** (o de una fuente oficial equivalente). Si
  solo existe en prensa, avisa al usuario antes de seguir.
- Si hay versión en castellano y en otra lengua, usa la castellana y registra la otra.

## 1. Ejecutar
Opción A — GitHub (también desde el móvil): Actions → **Ingestar programa** → Run workflow
(candidatura, convocatoria, URL). Abre un PR automáticamente. La vigilancia
(`watch-programs.yml`) también lo lanza sola en borrador al detectar un documento oficial.

Opción B — local:
```bash
git switch -c ingest/<convocatoria>-<candidatura>
cd pipeline
uv run vc fetch   --candidatura <id> --convocatoria <conv> --url "<url>"
uv run vc extract --candidatura <id> --convocatoria <conv>
uv run vc analyze --candidatura <id> --convocatoria <conv>
uv run vc verify  --candidatura <id> --convocatoria <conv>
uv run vc report  --candidatura <id> --convocatoria <conv> > ../report.md
uv run vc validate
```
Después: commit, push y `gh pr create --title "Programa <conv> · <Partido>" --body-file report.md`.

## 2. Revisar (antes de aprobar)
- Lanza los agentes `grounding-auditor` y `neutrality-reviewer` sobre el JSON del análisis.
- Lee el informe: temas sin mención (¿de verdad no lo menciona? búscalo en el texto),
  citas descartadas, avisos de neutralidad, coste.
- Muestrea al menos 10 citas abriendo el PDF en la página indicada.
- Si hay errores: corrige vía re-análisis del tema (`vc analyze --tema <id> --force`), no
  editando literales a mano.

## 3. Aprobar
- Cambia `estado: aprobado` en el JSON (o `vc approve`) dentro del PR.
- El usuario hace merge. Railway despliega solo. Comprueba en producción: la tarjeta del
  partido ya no muestra el aviso de 2023 y las citas abren la página correcta.
- La página de metodología refleja la fecha de aprobación automáticamente.

## Nunca
- Aprobar con citas no verificadas (la CI lo impide; no lo sortees).
- Mezclar dos candidaturas en un mismo PR (salvo el PR único de referencia de 2023).
- Sobrescribir un análisis aprobado sin `--force` explícito y sin decírselo al usuario.
