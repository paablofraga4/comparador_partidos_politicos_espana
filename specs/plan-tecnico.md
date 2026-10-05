# Plan técnico

- **Estado**: borrador · pendiente de aprobación
- **Implementa**: specs [001](001-datos-y-analisis/spec.md), [002](002-comparador/spec.md) y [003](003-chat/spec.md)

## Arquitectura

```
 PDFs oficiales (webs de los partidos)
        │
        ▼
 pipeline/  · Python, se ejecuta offline (en local o en GitHub Actions)
   fetch ─► extract ─► chunk ─► analyze ─► verify ─► report ─► PR
             PyMuPDF             OpenAI      citas literales
             texto+posiciones    structured  + rectángulos de
                                 outputs     resaltado
        │ escribe
        ▼
 data/  · fuente de verdad, en git y revisable por diff
   parties.yaml · topics.yaml · sources.yaml
   documents/<convocatoria>/<partido>.pdf
   extracted/<convocatoria>/<partido>.jsonl   (páginas y chunks con posiciones)
   analyses/<convocatoria>/<partido>.json     (todos los temas, con citas)
        │                                   │
        │ build (páginas estáticas)         │ pre-deploy: db:sync (embeddings incrementales)
        ▼                                   ▼
 web/  · Next.js 16 en Railway ◄────────► Postgres + pgvector en Railway
   · comparador, fichas y temas (SSG)        · chunks con embedding y FTS en español
   · panel de fuente y visor (pdf.js)        · límites de uso (hash de IP)
   · /api/chat (AI SDK + tools de OpenAI)    · métricas agregadas
```

## Decisiones

**D1 · Monorepo**. Carpetas `web/` (TypeScript), `pipeline/` (Python), `data/`, `evals/` y
`specs/`. Railway despliega un único servicio web.

**D2 · Los análisis viven en git, no en la base de datos**. Así se revisan por *diff*, se
audita el historial, deshacer un cambio es un `git revert` y la web se genera estática. El
paso de 2023 al 29N es el merge de un PR (spec 001, HU-1.7).

**D3 · Copia de los PDFs en el repo** (sin LFS, porque el ancho de banda de LFS penaliza
los builds). Se estiman menos de 150 MB para las dos convocatorias. Así la URL de cada cita
es estable aunque el partido mueva o borre su PDF. Siempre se enlaza también la URL original
y la copia de la Wayback Machine.

**D4 · Extracción con PyMuPDF**:
- texto por página y bloques con *bounding box*;
- etiqueta de página impresa;
- los rectángulos de resaltado se calculan **en el pipeline** con `page.search_for(cita)` y
  se guardan normalizados de 0 a 1, para que el navegador solo tenga que dibujarlos;
- OCR (`ocrmypdf`) solo si el documento no tiene capa de texto.

**D5 · Análisis con el documento completo y caché**:
- Los programas tienen entre 50 y 300 páginas, lo que cabe en el contexto de los modelos
  actuales. Por cada partido se hace **una llamada por tema** con el documento completo como
  prefijo idéntico, de modo que la caché automática de *prompts* de OpenAI abarata el coste.
  El texto lleva marcas de chunk (`⟦c:pp-26-p047-02⟧`).
- La salida usa *structured outputs* (JSON Schema estricto) con este contenido: `menciona`,
  `resumen[] {texto, citas[] {chunk_id, literal}}` y `propuestas[] {texto, subtema, citas[]}`.
- Una segunda llamada genera la lectura fácil a partir de la salida anterior, sin documento,
  para que no pueda añadir hechos nuevos.
- **Verificación determinista**: cada `literal` debe ser una subcadena (normalizada) del
  chunk citado. Si no lo es, se reintenta una vez y, si vuelve a fallar, se descarta la
  afirmación y se anota en el informe.
- Si un documento no cabe en el contexto, se hace en dos pasos: clasificar los chunks por
  tema y luego analizar.
- Se usa temperatura 0 y se registran el modelo y la versión del prompt.

**D6 · Lint de neutralidad**. En el informe se combinan un léxico de términos valorativos
(determinista), la comparación de extensiones frente a la media y un revisor con IA. Los
avisos no bloquean: los decide el humano en el PR.

**D7 · Búsqueda del chat**. Es híbrida en Postgres:
- FTS con `to_tsvector('spanish')` y `unaccent`, más pgvector por similitud coseno, fusionadas
  con RRF;
- filtros por partido y convocatoria;
- los embeddings los calcula `db:sync` en el *pre-deploy*, solo para los chunks nuevos (por
  hash).

**D8 · Orquestación del chat**. AI SDK (`ai` v7 y `@ai-sdk/openai`) con `streamText` y tres
*tools*:
- `obtener_analisis(partidos[], temas[], convocatoria?)`: devuelve los análisis ya revisados.
  Es la primera opción para preguntas de un tema.
- `buscar_en_programas(consulta, partidos?, convocatoria?)`: búsqueda híbrida que devuelve
  chunks con su id, página y texto.
- `listar_partidos()`: partidos y estado de sus programas.

La respuesta cita con marcas `[[c:ID]]`. Un validador en el servidor elimina las marcas que
no estén en los resultados de las *tools* de ese turno, y el cliente las convierte en
*chips* que abren el panel de fuente.

**D9 · Modelos**. Se configuran por entorno: `OPENAI_MODEL_ANALYSIS`, `OPENAI_MODEL_CHAT`,
`OPENAI_MODEL_FAST` y `OPENAI_EMBEDDING_MODEL`. Se fijan en la fase 1 tras consultar el
catálogo real (`GET /v1/models`) y compararlos con los evals. No se dejan nombres de modelos
supuestos en el código.

**D10 · Frontend**:
- Next.js 16 (App Router), TypeScript estricto y Tailwind CSS v4;
- primitivas accesibles de Radix (vía shadcn/ui) y Motion para las animaciones;
- `next/font` para las tipografías y `pdfjs-dist` para el panel de fuente y el visor;
- estado del comparador en la URL (`nuqs`).

**D11 · Despliegue en Railway**:
- Servicio `web`: `Dockerfile` en la raíz, necesario porque el build lee `data/`, que está
  fuera de `web/`.
- Servicio `postgres`: plantilla de Postgres con pgvector.
- *Pre-deploy*: `npm run db:migrate && npm run db:sync`.
- Despliegue automático con cada push a `main`.

**D12 · CI (GitHub Actions)**:
- `ci.yml`: lint, typecheck, tests y build de web; ruff y pytest del pipeline; y
  `validate-data` (esquemas, citas verificadas, simetría de límites y que todo partido × tema
  exista).
- `ingest.yml` (*workflow_dispatch*): recibe partido, convocatoria y URL, ejecuta el pipeline
  y abre un PR con el informe.
- `evals.yml` (manual o en PRs que tocan el chat): ejecuta los evals con un tope de coste.

**D13 · Tests**:
- Vitest para la lógica de web (validador de citas, regla de *fallback* y RRF).
- Playwright para el e2e: flujo de comparación, cita → panel en la página correcta, lectura
  fácil y axe.
- pytest para el pipeline, con PDFs de prueba pequeños.

**D14 · Privacidad y abuso**:
- Límite de uso por `HMAC(IP, sal diaria)` en Postgres, con borrado a las 24 h.
- Nunca se registra el contenido de las preguntas.
- Tope de gasto diario contabilizado por los tokens de cada respuesta.

## Estructura del repositorio

```
.
├── CLAUDE.md · README.md · Dockerfile · .env.example
├── specs/              constitución, specs, plan, tareas y plantillas
├── .claude/            settings (permisos y hooks), skills y agents
├── .github/workflows/  ci, ingest y evals
├── data/               registros, PDFs, texto extraído y análisis
├── pipeline/           paquete Python «cmp» (uv): fetch, extract, analyze, verify y report
├── web/                Next.js: app/, components/, lib/ y db/
└── evals/              preguntas de referencia y runner
```

## Modelo de datos

**Análisis** (`data/analyses/<convocatoria>/<partido>.json`):

```jsonc
{
  "convocatoria": "generales-2026",
  "partido": "pp",
  "estado": "borrador",            // borrador | aprobado
  "documento": { "id": "generales-2026/pp", "sha256": "…", "paginas": 230, "idioma": "es" },
  "generado": { "fecha": "…", "modelo": "…", "prompt": "analisis@1", "coste_usd": 1.2 },
  "temas": {
    "vivienda": {
      "menciona": true,
      "resumen":     [{ "texto": "…", "citas": ["c0012"] }],
      "propuestas":  [{ "id": "vivienda-1", "texto": "…", "subtema": "alquiler", "citas": ["c0012"] }],
      "lectura_facil": { "resumen": [/* … */], "propuestas": [/* … */] }
    }
  },
  "citas": {
    "c0012": {
      "chunk": "pp-26-p047-02", "pagina": 47, "pagina_impresa": "45",
      "literal": "…", "idioma": "es", "traduccion": null,
      "rects": [[0.12, 0.40, 0.88, 0.43]], "verificada": true
    }
  }
}
```

**Postgres**:
- `chunks(id, convocatoria, partido, pagina, texto, tsv, embedding vector, hash)`
- `rate_limits(clave_hash, ventana, contador)`
- `uso_diario(fecha, preguntas, tokens_in, tokens_out, coste_usd)`

## Calendario

| Fase | Contenido | Objetivo |
|---|---|---|
| F0 | Harness, constitución y specs | 6 oct · **tu aprobación** |
| F1 | Pipeline y programas de 2023 analizados y aprobados | 12 oct |
| F2 | Comparador, panel de fuente, visor y lectura fácil | 21 oct |
| F3 | Chat y evals | 28 oct |
| F4 | Railway, dominio, accesibilidad, rendimiento y pulido | **online el 2 nov** |
| F5 | Ingesta de los programas del 29N según se publiquen (< 24 h cada uno) | 2-27 nov |

La campaña empieza el 13 de noviembre: la web tiene que estar estable antes.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Un partido publica tarde o nunca su programa | *Fallback* a 2023 con aviso; estado visible en la metodología |
| PDF escaneado o con maquetación compleja (columnas, tablas) | OCR y revisión del texto extraído en el informe |
| Alucinación o cita que no respalda la afirmación | Verificación literal, revisor con IA y revisión humana; evals en el chat |
| Acusaciones de sesgo | Constitución pública, repo público, simetría y canal de errores |
| Pico de tráfico en campaña | Comparador estático y chat con límites y tope de gasto |
| Coste de la IA | Caché de *prompts*, tope diario y modelos según los evals |
