---
name: sdd-tasks
description: Descompone un plan aprobado en tareas pequeñas, ordenadas y verificables en specs/tasks.md. Úsala tras aprobar un plan o cuando el usuario diga "saca las tareas de…".
argument-hint: "<fase o NNN de la spec>"
---

# /sdd-tasks — del plan a pasos verificables

## Reglas para cada tarea

- **Pequeña**: se completa y verifica en una sesión corta; si no, divídela.
- **Identificador** `T-XYZ` (X = fase) y verbo en infinitivo.
- **Verificación** explícita con `**V:**` (test, comando, e2e, revisión con un agente).
- **Orden** por dependencias; los tests o fixtures van antes o junto a la implementación.
- Referencia la historia que cubre si no es obvio (`(HU-2.3)`).

## Pasos

1. Lee el plan aprobado y las tareas existentes en `specs/tasks.md`.
2. Añade una sección `## F<n> · <nombre>` o amplía la existente. No reescribas tareas ya
   marcadas `[x]`.
3. Comprueba que toda historia y todo criterio de aceptación de la spec quedan cubiertos por
   al menos una tarea; si no, añade la tarea que falta.
4. Enseña al usuario la lista (solo títulos) y pide luz verde para `/sdd-implement`.
