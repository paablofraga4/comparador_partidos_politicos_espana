# Tareas · VotoClaro

Cada tarea es pequeña y comprobable. Al completarla se marca `[x]` y se hace commit.
**V:** indica cómo se verifica. Lanzamiento: **domingo 11 de octubre**.

## F0 · Harness y specs (lun 5)
- [x] T-001 Repo, `.gitignore`, `.gitattributes` y `.env.example`
- [x] T-002 `CLAUDE.md`, `.claude/settings.json` (permisos y hooks), skills y agents
- [x] T-003 Constitución, specs 001-003, plan técnico y tareas
- [x] T-004 Registros iniciales: `data/candidaturas.yaml` y `data/topics.yaml`
- [x] T-005 Aprobación de las specs por el propietario (con cambios)
- [x] T-006 Licencias (MIT y CC BY 4.0)

## F1a · Pipeline (mar 6)
- [x] T-101 Instalar `uv` y crear el esqueleto de `pipeline/` (paquete `votoclaro` (CLI `vc`), typer, ruff y pytest). **V:** `uv run vc --help`
- [x] T-102 Esquemas Pydantic (candidatura, tema, fuente, documento, chunk, análisis y cita) y exportación a JSON Schema. **V:** tests
- [x] T-103 `vc fetch`: PDF o HTML (HTML → PDF con Playwright), SHA-256, `sources.yaml` y Wayback. **V:** test con fichero local
- [x] T-104 `vc extract`: páginas, bloques, etiquetas, jerarquía de secciones, idioma y OCR. **V:** test con PDF de prueba
- [x] T-105 `vc chunk`: ids estables, cabecera contextual y respeto de párrafos. **V:** tests
- [x] T-106 Localizar y registrar los PDFs de 2023 con continuidad (10/11; **Junts pendiente**: solo hay copia oficial truncada). **V:** `vc status`
- [ ] T-107 Elegir los modelos (`/v1/models`) y documentarlos. **Requiere la `OPENAI_API_KEY`**
- [x] T-108 `vc verify`: literalidad normalizada y rectángulos (también entre dos páginas). **V:** tests con citas falsas
- [x] T-109 `vc validate` (esquemas, citas, límites, completitud y lectura fácil). **V:** falla con datos corruptos

## F1b · Análisis de 2023 (mié 7)
- [ ] T-110 `vc analyze`: programa completo, caché, *structured outputs*, reintentos y coste. **V:** 1 candidatura × 3 temas
- [ ] T-111 Red de seguridad para «no menciona» (búsqueda híbrida local). **V:** test con un tema escondido
- [ ] T-112 `vc easy-read`: generación, reglas UNE (INFLESZ…) y juez de fidelidad. **V:** tests de reglas
- [ ] T-113 `vc report`: informe Markdown para el PR. **V:** informe de ejemplo
- [ ] T-114 Ejecutar todo 2023, revisar con `grounding-auditor` y `neutrality-reviewer`, y aprobar en un único PR

## F2 · Comparador web (mié 7 - jue 8)
- [ ] T-201 Next.js 16, TypeScript estricto, Tailwind v4, shadcn/ui, Vitest y Playwright en `web/`. **V:** build
- [ ] T-202 Concretar la skill `editorial-design` en código: tokens, tipografías, componentes base y modo oscuro
- [ ] T-203 Capa de datos (`data/` en el build, regla de *fallback*, tipos desde el JSON Schema). **V:** tests del *fallback*
- [ ] T-204 Inicio
- [ ] T-205 Selector de candidaturas y temas con el estado en la URL
- [ ] T-206 Comparativa (escritorio en columnas, móvil en tarjetas)
- [ ] T-207 Ficha de candidatura y página de tema
- [ ] T-208 Panel de fuente: página del PDF con el resaltado visible y *scroll* al fragmento, páginas contiguas y URL propia. **V:** e2e en escritorio y móvil
- [ ] T-209 Visor completo `/programas/...` con búsqueda
- [ ] T-210 Modo lectura fácil
- [ ] T-211 Metodología (criterio del BOE, estado y fechas, lectura fácil) y «¿Ves un error?» (plantilla de *issue*)
- [ ] T-212 SEO y Open Graph
- [ ] T-213 Accesibilidad (axe) y revisión con `ui-reviewer`

## F3 · Chat (vie 9)
- [ ] T-301 Postgres: migraciones (pgvector, unaccent, FTS en español, HNSW) y `db:sync` incremental de propuestas y fragmentos
- [ ] T-302 Búsqueda híbrida con RRF, búsqueda por candidatura y *reranking*. **V:** evals de recuperación
- [ ] T-303 `/api/chat`: AI SDK, 4 *tools*, *prompt* de sistema y validador de citas. **V:** tests del validador
- [ ] T-304 Interfaz del chat (*streaming*, citas → panel, sugerencias y acotado)
- [ ] T-305 Límites de uso, tope de gasto diario y métricas agregadas
- [ ] T-306 `evals/`: 60 o más preguntas, juez y runner; `evals.yml`. **V:** umbrales de la spec 003

## F4 · Despliegue y lanzamiento (sáb 10 - dom 11)
- [ ] T-401 `Dockerfile` y prueba del build en local
- [ ] T-402 Railway: proyecto, Postgres con pgvector, variables y *pre-deploy*. **Requiere tu `railway login`**
- [ ] T-403 `ci.yml` e `ingest.yml` en GitHub Actions. **Requiere el secreto `OPENAI_API_KEY` en GitHub**
- [ ] T-404 `watch-programs.yml` (versión mínima: páginas `vigilar` → *issue*)
- [ ] T-405 Rendimiento (Lighthouse), revisión final con los tres agentes y correcciones
- [ ] T-406 🚀 Lanzamiento: despliegue y *smoke test* en producción

## F5 · Campaña (después del lanzamiento)
- [ ] T-501 Vigilancia completa: noticias e ingesta automática en borrador (12-14 oct)
- [ ] T-502 `watch-boe.yml` y vigilancia de coaliciones (antes del 16 oct)
- [ ] T-503 *Parser* de candidaturas del BOE y `circunscripciones` en `candidaturas.yaml` (antes del 28 oct)
- [ ] T-504 «Tu papeleta» (`/tu-papeleta`) (antes del 28 oct)
- [ ] T-505 Validación humana de la lectura fácil: fase 1 con una entidad especializada y fase 2 de ajuste
- [ ] T-506 Ingesta de cada programa del 29N (menos de 24 h)
