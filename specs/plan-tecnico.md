# Plan técnico · VotoClaro

- **Estado**: aprobado (5 oct 2026) · objetivo de lanzamiento: **domingo 11 de octubre**
- **Implementa**: specs [001](001-datos-y-analisis/spec.md), [002](002-comparador/spec.md) y [003](003-chat/spec.md)

## Arquitectura

```
 Webs de partidos · BOE (datos abiertos) · noticias
        │  vigilancia (GitHub Actions, cron) → issue + PR en borrador
        ▼
 pipeline/  · Python, se ejecuta offline (en local o en GitHub Actions)
   fetch ─► extract ─► chunk ─► analyze ─► verify ─► recall-check ─► easy-read ─► report ─► PR
   (PDF/HTML) PyMuPDF   contexto  programa    literal +   red de        reglas UNE
              texto,    de        completo +  rects de    seguridad     + fidelidad
              posición, sección   caché       resaltado   («no menciona»)
              secciones
        │ escribe
        ▼
 data/  · fuente de verdad, en git
   candidaturas.yaml · topics.yaml · sources.yaml
   documents/<conv>/<cand>.pdf · extracted/<conv>/<cand>.jsonl · analyses/<conv>/<cand>.json
        │ build (estático)                  │ pre-deploy: db:sync (índices incrementales)
        ▼                                   ▼
 web/  · Next.js 16 en Railway ◄────────► Postgres + pgvector en Railway
   · comparador, fichas, temas, papeleta     · índice de propuestas (FTS + vector)
   · panel de fuente y visor (pdf.js)        · índice de fragmentos contextuales (FTS + vector)
   · /api/chat: AI SDK + tools de OpenAI     · límites de uso y uso diario agregado
```

## Decisiones

**D1 · Monorepo**. Carpetas `web/` (TypeScript), `pipeline/` (Python con uv), `data/`,
`evals/` y `specs/`. Railway despliega un único servicio web más Postgres.

**D2 · Los análisis viven en git**, no en la base de datos: se revisan por *diff*, se puede
volver atrás con `git revert` y la web se genera estática. Pasar de 2023 al 29N es hacer
merge de un PR.

**D3 · Copia de los PDFs en el repo**, sin LFS. Así las citas tienen una URL estable aunque
el partido borre el original. Siempre se enlazan también la URL original y la de Wayback.

**D4 · Extracción con PyMuPDF**:
- texto por página, bloques con *bounding box*, etiqueta de página impresa y jerarquía de
  títulos (por tamaño y peso de fuente, más el índice del PDF si existe);
- los rectángulos de resaltado se calculan en el pipeline con `page.search_for()` y se guardan
  normalizados (de 0 a 1);
- OCR con `ocrmypdf` solo si hace falta;
- los programas en **HTML** se archivan como PDF con Playwright (`page.pdf()`) y luego siguen
  el mismo camino.

**D5 · Análisis del comparador: extracción exhaustiva con el programa completo en contexto**
(decisión razonada en la spec 001):
- Se hace una llamada por tema con el programa entero como prefijo idéntico, para
  aprovechar la caché automática de *prompts* de OpenAI. El texto lleva marcas de fragmento
  `⟦c:ID⟧`.
- La salida usa *structured outputs* con JSON Schema estricto: `menciona`,
  `resumen[] {texto, citas[{chunk_id, literal}]}` y `propuestas[] {texto, subtema, citas[]}`.
- **Verificación determinista** de cada literal. Si falla, se reintenta una vez y, si vuelve
  a fallar, se descarta la afirmación y se anota en el informe.
- **Red de seguridad**: para cada `menciona: false`, búsqueda híbrida con los subtemas. Si
  aparecen fragmentos por encima del umbral, se reanaliza el tema con esos fragmentos
  destacados y se anota en el informe.
- Si un documento no cabe en el contexto, se clasifican los fragmentos por tema y se analiza
  después.
- Temperatura 0; se registran el modelo, la versión del *prompt* y el coste.

**D6 · Lectura fácil**:
- Una llamada aparte, sin el documento, a partir de la salida verificada.
- `vc easy-read check` aplica reglas deterministas: longitud de frase, INFLESZ calculado con
  silabeo en español, siglas, números en cifras, dobles negaciones y palabras poco frecuentes
  según una lista de frecuencias del español.
- Un juez automático comprueba la fidelidad.
- Si falla, se regenera hasta 2 veces; si sigue fallando, se marca en el informe.

**D7 · Búsqueda del chat: RAG agéntico híbrido y simétrico**. Todo en Postgres:
- **Índices**: `propuestas` (texto de cada propuesta con partido, tema y subtema, más sus
  citas) y `fragmentos` (texto con su cabecera contextual: candidatura, convocatoria,
  «Capítulo > Sección» y página).
- **Léxico**: `to_tsvector('spanish', unaccent(...))` con `ts_rank_cd`.
- **Semántico**: pgvector con distancia coseno e índice HNSW. Los embeddings se calculan en
  `db:sync`, solo para los elementos nuevos (por hash).
- **Fusión** RRF (k=60), con los filtros de convocatoria vigente y candidaturas.
- ***Reranking***: el modelo rápido puntúa los 40 mejores candidatos en una sola llamada y se
  quedan 8. Se activa o desactiva por variable de entorno, según los evals.
- **Simetría**: si la pregunta implica varias candidaturas, se hace una búsqueda por cada una
  con la misma *k*.

**D8 · Orquestación del chat**. AI SDK (`ai` v7 y `@ai-sdk/openai`) con `streamText`, un
máximo de 4 pasos y cuatro *tools*:
- `obtener_analisis(candidaturas[], temas[], convocatoria?)`: análisis verificados. Va
  primero.
- `buscar_propuestas(consulta, candidaturas?)`: índice de propuestas.
- `buscar_en_programas(consulta, candidaturas?, convocatoria?)`: índice de fragmentos.
- `listar_candidaturas(provincia?)`: candidaturas y estado de sus programas.

Las citas van con la marca `[[c:ID]]`. Un validador en el servidor elimina las marcas que no
estén en los resultados de las *tools* de ese turno.

**D9 · Modelos**. Por entorno: `OPENAI_MODEL_ANALYSIS`, `OPENAI_MODEL_CHAT`,
`OPENAI_MODEL_FAST` y `OPENAI_EMBEDDING_MODEL`. Se fijan en la T-107 consultando
`GET /v1/models` y probando con los evals. Nunca se escriben nombres de modelo de memoria.

**D10 · Frontend**:
- Next.js 16 (App Router), TypeScript estricto y Tailwind v4;
- shadcn/ui (Radix), Motion y `nuqs` (estado en la URL);
- `next/font` con Newsreader y Public Sans;
- `pdfjs-dist` cargado bajo demanda, con una capa de rectángulos encima;
- *scroll* automático al primer rectángulo del resaltado.

**D11 · Railway**:
- Servicio `web` con `Dockerfile` en la raíz (el build necesita `data/`).
- Postgres con pgvector.
- *Pre-deploy*: `npm run db:migrate && npm run db:sync`.
- Despliegue automático desde `main` y dominio `*.up.railway.app` hasta que compres el tuyo.

**D12 · CI y automatizaciones (GitHub Actions)**:
- `ci.yml`: web (lint, typecheck, tests y build), pipeline (ruff y pytest) y
  `vc validate`, que comprueba esquemas, citas verificadas, límites, completitud y lectura
  fácil.
- `ingest.yml` (manual o lanzado por la vigilancia): candidatura, convocatoria y URL → PR.
- `watch-programs.yml` (cron cada 3 h, hasta el 27 de noviembre): páginas `vigilar` y
  búsqueda de noticias → *issue* y, si es un documento oficial, `ingest.yml` en borrador.
- `watch-boe.yml` (cron diario, del 16 de octubre al 3 de noviembre): API del sumario del BOE
  → *parser* de candidaturas → PR a `candidaturas.yaml`.
- `evals.yml` (manual o en PRs que tocan el chat), con un tope de coste.

**D13 · Tests**:
- Vitest para el validador de citas, el *fallback*, RRF y la simetría.
- Playwright para el e2e: comparar, cita → página con el resaltado visible, lectura fácil,
  papeleta y axe.
- pytest con PDFs de prueba.

**D14 · Privacidad**: límite de uso por `HMAC(IP, sal diaria)` con borrado a las 24 h; nunca
se guarda el texto de las preguntas; tope de gasto diario.

**D15 · Licencias**:
- Código con licencia MIT (`LICENSE`).
- Análisis, textos y datos propios con CC BY 4.0 (`data/LICENSE`).
- Los PDFs de los programas son de sus partidos: se reproducen para documentar las fuentes y
  quedan excluidos de las licencias anteriores.
- Las citas literales se amparan en el derecho de cita (art. 32 LPI).

**D16 · Cupo gratis y bonos (spec 004)**:
- **Migración** `002_bonos.sql`:
  - `uso_gratis(clave, usadas)`, donde `clave` es el sha256 de la *cookie* `vc_uso`;
  - `bonos(id, codigo_hash, plan, total, usadas, por_hora, estado, sesion, pago, caduca)`;
  - `uso_diario` pasa a tener la clave `(fecha, tipo)`, con `tipo` gratis o pago.
- **Reserva atómica**: `update … set usadas = usadas + 1 where usadas < total returning`. Si la
  respuesta no llega a `onEnd`, se devuelve. Los 503 del proveedor se reintentan con
  `streamRetries`.
- **Módulos**:
  - `lib/bonos/`: `planes.ts`, `codigos.ts`, `cupo.ts` (reserva y devolución), `pagos.ts`
    (interruptor y salvaguardas) y `pasarela.ts` (Stripe con el SDK `stripe`, más una pasarela
    simulada solo para desarrollo).
  - Rutas en `/api/bonos/*`: comprar, confirmar, webhook, canjear y olvidar.
  - `/api/cupo`.
  - Páginas `/bono` y `/condiciones`.
- **Chat**: el cupo y el límite viajan como partes de datos (`data-cupo` y `data-limite`), y la
  interfaz pinta la tarjeta de planes.
- **Tests** con PGlite: cupo, bonos, caducidad, devoluciones y salvaguardas.

**D17 · Autoría y apoyos (spec 005)**:
- **Autoría**: el nombre y el LinkedIn del autor son constantes en `lib/autor.ts` (no variables
  de entorno: el *copyright* no depende del despliegue). El pie añade la línea final y
  `LICENSE` nombra al autor.
- **Migración** `003_apoyos.sql`:
  - `apoyos(id, tipo, importe_cent, nombre, estado, sesion, creado, activado)`, con `tipo`
    mensual o puntual y `estado` pendiente, activo o cancelado. `nombre` solo se guarda si la
    persona lo escribe y pasa el filtro; si no, es `null` (anónimo).
  - `apoyo_cobros(id, apoyo, importe_cent, pago, cobrado, devuelto)`. `id` es la factura
    (mensual) o el *PaymentIntent* (puntual), así que registrar el mismo cobro dos veces no
    duplica nada. `pago` es el *PaymentIntent*, para las devoluciones.
  - Sin emails, IPs ni ids de cliente o suscripción de Stripe: el apoyo se reconoce por su
    `apoyo_id` en los metadatos.
- **Stripe Checkout**, con el mismo SDK y la misma cuenta que los bonos:
  - una vez: `mode: payment`, `price_data` con el importe elegido y
    `payment_intent_data.metadata.apoyo_id`;
  - cada mes: `mode: subscription`, `price_data.recurring.interval = month` y
    `subscription_data.metadata.apoyo_id`. Las facturas lo heredan en
    `parent.subscription_details.metadata`;
  - `custom_fields`:
    - `nombre`: texto opcional de 40 caracteres como máximo;
    - `neutral`: desplegable obligatorio con una sola opción, la declaración de HU-5.6;
  - `custom_text.submit`: aportación voluntaria, no desgrava y se puede cancelar.
- **Eventos** en el mismo *webhook* que los bonos, `/api/bonos/webhook`:
  - `checkout.session.completed` con `apoyo_id` activa el apoyo y guarda el nombre. En los
    puntuales registra el cobro;
  - `invoice.paid` registra cada cobro mensual. El *PaymentIntent* se lee con
    `invoicePayments.list`;
  - `customer.subscription.deleted` marca el apoyo como cancelado. Sus cobros siguen contando;
  - `charge.refunded`, si es completa, marca el cobro como devuelto por su `pago`, igual que
    anula los bonos.
- **Vuelta del pago**: `/api/apoyos/confirmar` comprueba la sesión con Stripe, activa el apoyo
  y redirige a `/apoya/gracias`, que dice si el nombre saldrá. Es idempotente, igual que el
  *webhook*.
- **Pasarela simulada**: en desarrollo, como en los bonos. Su *webhook* sin firma acepta
  `apoyo-cobrado` y `devuelto` para probar meses siguientes y devoluciones.
- **Filtro de nombres** (`lib/apoyos/nombres.ts`): se normaliza (espacios, 40 caracteres) y se
  descarta, quedando anónimo, si contiene:
  - un enlace o una arroba;
  - las siglas o el nombre de una candidatura de `candidaturas.yaml`, como palabra completa y
    sin distinguir mayúsculas ni tildes;
  - un lema político o un insulto de una lista corta.

  Ante la duda, el nombre se queda en anónimo.
- **Ocultar un nombre** sin panel de administración: el `apoyo_id` aparece en los metadatos
  del pago en Stripe, y el propietario lo añade a la variable `APOYOS_OCULTOS` de Railway, que
  redespliega sola.
- **Interruptor**: `APOYOS_ACTIVOS=1` con las mismas salvaguardas que `estadoPagos()`: claves de
  Stripe y datos del titular. El enlace del portal de clientes de Stripe va en
  `STRIPE_PORTAL_URL`. El periodo del tablón va en `APOYOS_PERIODO`, `total` (por defecto) o
  `mes`.
- **Cuentas** (`lib/apoyos/cuentas.ts`):
  - costes fijos en `data/costes.yaml`, versionado y con fecha por partida;
  - la IA, con la suma de `uso_diario.coste_usd` de los últimos 30 días, en dólares, porque
    OpenAI factura en dólares y no inventamos un tipo de cambio;
  - los bonos, con el precio de su plan si están activos;
  - las comisiones de Stripe, estimadas al 1,5 % + 0,25 € por cobro, y rotuladas como
    estimación.
- **Páginas**:
  - La portada sigue siendo estática: los costes fijos se leen en el *build* desde `data/`.
    `APOYOS_ACTIVOS` se declara como `ARG` en el `Dockerfile` para que el *build* sepa si
    pintar los botones, porque Railway solo pasa al *build* las variables declaradas.
    Cambiarla redespliega.
  - `/apoya` y `/apoya/gracias` son dinámicas (`force-dynamic`) y van con `noindex` solo en
    gracias.
  - En `/apoya` se reutiliza `TarjetaPlanes` para comprar preguntas del chat.
  - Los formularios de apoyo son HTML (`POST` a `/api/apoyos/iniciar`, que responde con un 303
    a Stripe): no añaden JavaScript.
- **Puerta de la constitución**:

  | Principio | Cómo lo cumple el plan |
  |---|---|
  | I. Neutralidad | Ni el contenido ni el orden ni el chat leen nada de `apoyos`. Declaración obligatoria en Checkout, filtro de nombres con las candidaturas y ningún color de partido en el tablón. |
  | II. Grounding | No toca análisis ni citas. |
  | III. Transparencia | Costes versionados en `data/costes.yaml`, IA calculada con datos reales y comisiones rotuladas como estimación. |
  | IV. Asistente | No toca el chat. |
  | V. Accesibilidad | Listas `<ol>`/`<ul>`, formularios con `<label>`, teclado, 375 px y objetivos de 44 px. Lectura fácil del texto de la portada. |
  | VI. Privacidad | Sin emails, IPs ni ids de cliente. Nombre solo si se escribe para el tablón. Sin *cookies* nuevas. |
  | VII. Calidad | Tests con PGlite y verificación con la pasarela simulada antes de `main`. |

- **Verificación**:
  - HU-5.1: test del pie y revisión visual;
  - HU-5.2: *build* con el interruptor encendido y apagado, y revisión visual en escritorio y
    375 px;
  - HU-5.3 y HU-5.5: tests de cuentas y tablón (total y mes, top sin importes, anónimos,
    devueltos, ocultos);
  - HU-5.4 y HU-5.7: flujo completo con la pasarela simulada: mensual con nombre, segundo
    cobro, puntual anónimo y devolución;
  - HU-5.6: tests del filtro de nombres;
  - HU-5.8: test de las salvaguardas del interruptor.

## Modelo de datos

**Análisis** (`data/analyses/<conv>/<cand>.json`):

```jsonc
{
  "convocatoria": "generales-2026",
  "candidatura": "pp",
  "estado": "borrador",            // borrador | aprobado
  "documento": { "id": "generales-2026/pp", "sha256": "…", "paginas": 230, "idioma": "es" },
  "generado": { "fecha": "…", "modelo": "…", "prompt": "analisis@1", "coste_usd": 1.2 },
  "temas": {
    "vivienda": {
      "menciona": true,
      "red_seguridad": null,       // si menciona=false: {ejecutada, fragmentos_revisados, reanalizado}
      "resumen":    [{ "texto": "…", "citas": ["c0012"] }],
      "propuestas": [{ "id": "vivienda-1", "texto": "…", "subtema": "alquiler", "citas": ["c0012"] }],
      "lectura_facil": {
        "resumen": [/* … */], "propuestas": [/* … */],
        "legibilidad": { "inflesz": 72.4, "max_palabras_frase": 14, "ok": true }
      }
    }
  },
  "citas": {
    "c0012": {
      "chunk": "pp-26-p047-02", "pagina": 47, "pagina_impresa": "45",
      "literal": "…", "idioma": "es", "traduccion": null,
      "rects": [{ "pagina": 47, "r": [0.12, 0.40, 0.88, 0.43] }], "verificada": true
    }
  }
}
```

**Postgres**:
- `propuestas(id, conv, cand, tema, subtema, texto, citas jsonb, tsv, embedding, hash)`
- `fragmentos(id, conv, cand, pagina, seccion, texto_contextual, tsv, embedding, hash)`
- `rate_limits(clave_hash, ventana, contador)`
- `uso_diario(fecha, preguntas, tokens_in, tokens_out, coste_usd)`

## Calendario hasta el lanzamiento

| Día | Fases | Resultado |
|---|---|---|
| **Lun 5** | F0 | Harness, specs aprobadas y repo ✅ |
| **Mar 6** | F1a | Pipeline (fetch, extract, chunk, verify y validate) y PDFs de 2023 localizados. **Necesito tu `OPENAI_API_KEY` en `.env`** |
| **Mié 7** | F1b y F2a | Análisis de 2023, red de seguridad, lectura fácil, revisión con agentes · esqueleto web, diseño y capa de datos |
| **Jue 8** | F2b | Comparador, ficha, temas, panel de fuente, visor, lectura fácil y metodología |
| **Vie 9** | F3 | Postgres, índices, búsqueda híbrida, *reranking*, chat y evals. **Necesito tu `railway login`** |
| **Sáb 10** | F4 | Railway, CI, vigilancia de programas (versión mínima), accesibilidad, rendimiento y revisión final |
| **Dom 11** | 🚀 | **Lanzamiento** y *smoke tests* |

## Después del lanzamiento

| Cuándo | Qué |
|---|---|
| 12-14 oct | Vigilancia de programas completa (noticias e ingesta automática en borrador) |
| antes del 16 oct | Vigilancia del BOE y de coaliciones |
| antes del 28 oct | *Parser* de candidaturas del BOE y «Tu papeleta» |
| 28 oct - 3 nov | Carga de todas las candidaturas presentadas y luego proclamadas |
| oct-nov | Validación humana de la lectura fácil (fase 1 y fase 2) |
| hasta el 27 nov | Ingesta de los programas del 29N en menos de 24 h cada uno |

## Riesgos

| Riesgo | Mitigación |
|---|---|
| El plazo del domingo | Alcance cerrado por día; si algo se retrasa, se recorta antes el *reranking* o el visor completo que el *grounding* o la revisión |
| Muchas candidaturas pequeñas tras el BOE | El pipeline es automático; revisión por agentes y muestreo humano; «No ha publicado programa» |
| Programas en HTML o escaneados | Archivo como PDF y OCR |
| Alucinaciones o citas que no respaldan lo afirmado | Verificación literal, red de seguridad, auditor, revisión humana y evals |
| Acusaciones de sesgo | Criterio del BOE sin filtro editorial, simetría, repo público y canal de errores |
| Pico de tráfico en campaña | Páginas estáticas; chat con límites y tope de gasto |
