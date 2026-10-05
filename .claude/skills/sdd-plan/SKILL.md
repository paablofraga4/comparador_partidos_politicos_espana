---
name: sdd-plan
description: Convierte una spec aprobada en un plan técnico (el CÓMO) siguiendo Spec-Driven Development. Úsala tras aprobarse una spec o cuando el usuario diga "planifica…". No escribe código de producto.
argument-hint: "<NNN de la spec>"
---

# /sdd-plan — del QUÉ al CÓMO

## Pasos

1. Verifica que la spec está aprobada (cabecera `Estado: aprobada`). Si no, para y pídelo.
2. Lee `specs/plan-tecnico.md`: las decisiones D1…Dn ya tomadas son la base. No las
   contradigas en silencio; si una debe cambiar, propónlo como decisión nueva que la sustituye.
3. Si la funcionalidad cabe en la arquitectura actual, añade sus decisiones a
   `specs/plan-tecnico.md`. Si es grande, crea `specs/NNN-*/plan.md` desde
   `specs/_plantillas/plan.md`.
4. Para cada decisión: contexto → opción elegida → alternativas descartadas y por qué.
5. Incluye la **puerta de la constitución**: tabla `Principio → cómo lo cumple el plan`.
   Grounding y neutralidad siempre tienen fila.
6. Define cómo se **verificará** cada historia (tipo de test, eval o comprobación manual).
7. Si hay librerías nuevas, comprueba versión actual (`npm view`, PyPI) y documentación;
   no supongas APIs de memoria.
8. Presenta el plan resumido y pide aprobación antes de `/sdd-tasks`.
