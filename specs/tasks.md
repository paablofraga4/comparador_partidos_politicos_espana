# Tareas

Cada tarea es pequeña y comprobable. Al completarla se marca `[x]` y se hace commit.
**V:** indica cómo se verifica.

## F0 · Harness y specs
- [x] T-001 Repo, `.gitignore` y `.env.example`
- [x] T-002 `CLAUDE.md`, `.claude/settings.json` (permisos y hooks), skills y agents
- [x] T-003 Constitución, specs 001-003, plan técnico y tareas
- [x] T-004 Registros iniciales: `data/parties.yaml` y `data/topics.yaml`
- [ ] T-005 **Aprobación de las specs por el propietario**

## F1 · Pipeline y datos de 2023
- [ ] T-101 Instalar `uv` y crear el esqueleto de `pipeline/` (paquete `cmp`, ruff, pytest y CLI con typer). **V:** `uv run cmp --help`
- [ ] T-102 Esquemas Pydantic de partidos, temas, fuentes, documento, chunk, análisis y cita, con su JSON Schema exportado para web. **V:** tests de esquema
- [ ] T-103 `cmp fetch`: descarga, SHA-256, `sources.yaml` y Wayback. **V:** test con PDF local
- [ ] T-104 `cmp extract`: páginas, bloques, etiquetas, idioma y detección de OCR, con salida `extracted/*.jsonl`. **V:** test con PDF de prueba
- [ ] T-105 `cmp chunk`: ids estables y tamaño objetivo, respetando párrafos. **V:** tests
- [ ] T-106 Localizar y registrar los PDFs de 2023 de todos los partidos (`sources.yaml`). **V:** `cmp fetch --all` sin errores
- [ ] T-107 Elegir los modelos: consultar `/v1/models` y fijarlos en `.env.example` y en la documentación
- [ ] T-108 `cmp analyze`: prompt por tema con caché, *structured outputs*, lectura fácil y registro de coste. **V:** ejecución en 1 partido × 3 temas
- [ ] T-109 `cmp verify`: literalidad normalizada, rectángulos con `search_for`, reintento y descarte. **V:** tests con citas falsas
- [ ] T-110 `cmp report`: informe Markdown para el PR (cobertura, verificación, neutralidad y coste). **V:** informe de ejemplo
- [ ] T-111 `cmp validate` para la CI (esquemas, citas, límites y completitud). **V:** falla con datos corruptos
- [ ] T-112 Ejecutar los programas de 2023 completos, revisar con `neutrality-reviewer` y `grounding-auditor`, y aprobar
- [ ] T-113 `.github/workflows/ci.yml` (pipeline y validate-data) e `ingest.yml`. **V:** ejecución en GitHub

## F2 · Comparador web
- [ ] T-201 Next.js 16, TypeScript estricto, Tailwind v4, shadcn/ui, Vitest y Playwright en `web/`. **V:** build
- [ ] T-202 Concretar la skill `editorial-design`: tokens, tipografías, componentes base y modo oscuro
- [ ] T-203 Capa de datos: lectura de `data/` en el build, regla de *fallback* y tipos generados desde el JSON Schema. **V:** tests de la regla de *fallback*
- [ ] T-204 Inicio
- [ ] T-205 Selector de partidos y temas con estado en la URL
- [ ] T-206 Comparativa (escritorio en columnas, móvil en tarjetas)
- [ ] T-207 Ficha de partido y página de tema
- [ ] T-208 Panel de fuente: pdf.js con *overlay* de rectángulos. **V:** e2e cita → página y resaltado correctos
- [ ] T-209 Visor completo `/programas/...`
- [ ] T-210 Modo lectura fácil
- [ ] T-211 Metodología con la tabla de estado y «¿Ves un error?»
- [ ] T-212 SEO y metadatos OG
- [ ] T-213 Accesibilidad (axe en e2e) y revisión con `ui-reviewer` en 375 px y escritorio

## F3 · Chat
- [ ] T-301 Esquema de Postgres y migraciones (pgvector, unaccent, FTS en español); `db:sync` incremental
- [ ] T-302 Búsqueda híbrida (RRF). **V:** tests de recuperación con preguntas conocidas
- [ ] T-303 `/api/chat`: AI SDK, *tools*, *prompt* de sistema y validador de citas. **V:** tests del validador
- [ ] T-304 Interfaz del chat: *streaming*, *chips* de cita → panel, sugerencias y acotado por partidos
- [ ] T-305 Límites de uso, tope de gasto diario y métricas agregadas
- [ ] T-306 `evals/`: 60 o más preguntas, runner y juez; `evals.yml`. **V:** umbrales de la spec 003

## F4 · Despliegue
- [ ] T-401 `Dockerfile` y prueba del build en local
- [ ] T-402 Railway: proyecto, Postgres con pgvector, variables y *pre-deploy* (requiere tu `railway login`)
- [ ] T-403 Despliegue automático desde `main`; *smoke test* en producción
- [ ] T-404 Rendimiento (Lighthouse) y pulido final

## F5 · Programas del 29N
- [ ] T-501 Cerrar la lista de candidaturas tras las coaliciones (16-O) y la proclamación
- [ ] T-502 Ingestar cada programa según se publique (`ingest.yml`), revisar y aprobar
