---
name: sdd-spec
description: Crea o actualiza una especificación funcional (spec) siguiendo Spec-Driven Development. Úsala cuando el usuario pida una funcionalidad nueva, un cambio de comportamiento visible o diga "haz la spec de…". No escribe código.
argument-hint: "<descripción de la funcionalidad>"
---

# /sdd-spec — escribir la spec (el QUÉ y el POR QUÉ)

Una spec describe **qué** debe pasar y **por qué**, nunca **cómo** (sin frameworks, tablas ni
endpoints). Es el contrato que el usuario aprueba antes de que exista código.

## Pasos

1. Lee `specs/constitution.md` y las specs existentes en `specs/*/spec.md` para no duplicar
   ni contradecir nada.
2. Si es una funcionalidad nueva, crea `specs/NNN-nombre-corto/spec.md` (NNN = siguiente número)
   a partir de `specs/_plantillas/spec.md`. Si amplía una existente, edítala y anota el cambio
   en su cabecera.
3. Rellena:
   - **Contexto**: problema y por qué importa.
   - **Historias de usuario** `HU-N.M` con criterios observables (qué ve/hace el usuario).
   - **Requisitos no funcionales** medibles (rendimiento, accesibilidad, privacidad).
   - **Criterios de aceptación** como checklist verificable.
   - **Fuera de alcance** explícito.
   - **Preguntas abiertas**: marca lo que no sepas con `[ACLARAR: …]`; no lo inventes.
4. Comprueba cada historia contra la constitución (neutralidad, grounding, transparencia,
   asistente que no opina, accesibilidad, privacidad). Si algo choca, dilo.
5. Si quedan dudas que cambian el alcance, pregunta al usuario (máx. 4 preguntas, con opción
   recomendada).
6. Deja `Estado: borrador · pendiente de aprobación` y **para**. Resume la spec al usuario en
   5-8 líneas y pide aprobación. No continúes a plan/tareas sin un "sí".
