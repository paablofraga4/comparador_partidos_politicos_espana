# VotoClaro · comparador de programas electorales (generales 29N-2026)

Web pública y **neutral** para comparar qué proponen las candidaturas, por temas predefinidos, y
preguntar en lenguaje natural. Cada afirmación lleva a su fuente (PDF original, página exacta,
fragmento resaltado). Mientras un partido no publique su programa del 29N, se muestra el del
23J-2023 con aviso. **Lanzamiento: domingo 11 oct 2026.** Unidad = *candidatura* (partido,
coalición o agrupación de electores); desde el BOE (~28 oct) entran todas las proclamadas.

## Reglas de oro (resumen de `specs/constitution.md`; léela entera si tocas contenido, prompts o UI)
1. **Nada sin cita verificada.** Si no hay respaldo literal en el programa → "No lo menciona".
   Nunca conocimiento externo. Skill: `grounding`.
2. **Simetría**: mismo trato, estructura, extensión y tono para todos; orden alfabético;
   sin adjetivos valorativos, rankings ni encuestas.
3. **El chat informa, no aconseja**: no recomienda voto, no valora, no predice.
4. **Privacidad**: no se guarda el texto de las preguntas del chat.
5. **No modifiques `specs/constitution.md`** sin aprobación explícita del usuario.
6. **Secretos**: nunca leas ni imprimas `.env`; documenta variables en `.env.example`.

## Cómo trabajamos (Spec-Driven Development)
- Funcionalidad nueva o cambio visible → `/sdd-spec` → aprobación → `/sdd-plan` → `/sdd-tasks`
  → `/sdd-implement`. Bugfix/copy pequeño: directo, pero verificado.
- Las tareas viven en `specs/tasks.md`; márcalas `[x]` al terminar y haz commit por tarea
  (`feat(T-XYZ): …`).
- Si la spec está mal, **para y propón el cambio**; no lo resuelvas en silencio en el código.
- Cada error que se repite se corrige en el harness (regla aquí, test, hook o eval).

## Mapa
- `specs/` constitución, specs 001 datos · 002 comparador · 003 chat, `plan-tecnico.md`, `tasks.md`
- `data/` `candidaturas.yaml`, `topics.yaml`, `sources.yaml`, `documents/` (PDFs), `extracted/`, `analyses/`
- `pipeline/` Python (uv), paquete `votoclaro` (CLI `vc`): fetch → extract → chunk → analyze → verify → report → validate
- `web/` Next.js 16 + TS + Tailwind v4; lee `data/` en build; `/api/chat` con AI SDK + OpenAI
- `evals/` preguntas de referencia del chat
- `.claude/` hooks (guardarraíles, formato, verificación al terminar), skills, agents

## Comandos (se crean en F1/F2; si no existen aún, no los inventes)
- Pipeline: `cd pipeline && uv run vc --help` · `uv run pytest -q` · `uv run ruff check .` · `uv run vc validate`
- Web: `cd web && npm run dev | typecheck | lint | test | test:e2e | build`
- Evals: `cd evals && …` (F3)

## Antes de decir "hecho"
- Typecheck, lint y tests de la zona tocada (el hook `Stop` lo comprueba y te bloquea si fallan).
- UI: míralo en el navegador en escritorio y 375 px; al cerrar una pantalla, agente `ui-reviewer`.
- Análisis o prompts: agentes `grounding-auditor` y `neutrality-reviewer`.
- Chat: evals con los umbrales de la spec 003.

## Skills y agentes del proyecto
- Skills: `sdd-spec`, `sdd-plan`, `sdd-tasks`, `sdd-implement`, `grounding`, `editorial-design`,
  `ingest-program` (cómo añadir/actualizar un programa: 2023 → 29N, vigilancia).
- Agentes (solo informan): `neutrality-reviewer`, `grounding-auditor`, `ui-reviewer`.

## Gotchas
- Windows + Git Bash en local; los hooks son Node (`.claude/hooks/*.mjs`) para ser portables.
- Modelos de OpenAI: siempre desde variables de entorno; no escribas nombres de modelo de memoria.
- Páginas: `pagina` = índice 1-based del PDF (visor); `pagina_impresa` = la que se muestra.
- Candidaturas del 29N cambian hasta la proclamación (BOE ~3 nov): todo en `data/candidaturas.yaml`, nunca en código.
- Comparador = extracción exhaustiva offline (no RAG); chat = RAG agéntico híbrido y simétrico (spec 001).
