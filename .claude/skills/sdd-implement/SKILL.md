---
name: sdd-implement
description: Implementa las siguientes tareas pendientes de specs/tasks.md una a una, verificando y haciendo commit de cada una. Úsala cuando el usuario diga "implementa", "sigue con la fase X" o "/sdd-implement T-203".
argument-hint: "[T-XYZ | F<n>]"
---

# /sdd-implement — construir, verificar y marcar

## Bucle por tarea

1. Elige la tarea indicada o la primera `- [ ]` de la fase en curso. Confirma que su spec y
   plan están aprobados.
2. Relee **solo** las secciones de spec/plan que afectan a la tarea y, si toca contenido,
   prompts o UI, las reglas de oro de `CLAUDE.md`. Carga la skill de dominio que aplique
   (`grounding`, `editorial-design`, `ingest-program`).
3. Implementa lo mínimo que satisface la tarea. Sin funcionalidades no pedidas.
4. Escribe o actualiza los tests indicados en `**V:**` y ejecútalos.
5. Si toca UI: compruébalo en el navegador (escritorio y 375 px) y, al cerrar una pantalla,
   pásale el agente `ui-reviewer`. Si toca análisis o prompts: `neutrality-reviewer` y
   `grounding-auditor`.
6. Marca `- [x]` en `specs/tasks.md` y haz commit: `feat(T-XYZ): <qué>` (o `fix`, `chore`,
   `docs`, `test`).
7. Siguiente tarea. Para al terminar la fase, ante un bloqueo o si la spec resulta
   incorrecta.

## Si la spec está mal o incompleta

No la "arregles" en el código. Para, explica la discrepancia y propone el cambio de spec al
usuario. Solo tras aprobarlo se actualiza la spec y luego el código.

## Si un error se repite

Corrígelo en el harness: una regla en `CLAUDE.md`, un test, un hook o un eval, y menciónalo
en el commit.
