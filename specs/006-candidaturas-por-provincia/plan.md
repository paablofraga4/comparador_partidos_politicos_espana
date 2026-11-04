# Plan · Spec 006 Candidaturas por provincia

- **Estado**: aprobado (4 nov 2026)
- **Implementa**: [spec 006](spec.md) · **Base**: [plan técnico](../plan-tecnico.md)

## Decisiones
**D1 · Dónde vive la página** — hoy «Tu papeleta» pinta la lista en el navegador según la
provincia guardada, y un buscador no la ve → una ruta propia por circunscripción
(`/tu-papeleta/[provincia]`), estática, que se genera con los datos del BOE. Descartado:
parámetro en la URL (no se indexa bien y no tiene título propio).

**D2 · Selector** — elegir provincia navega a su página y la recuerda en el navegador; «Tu
papeleta» ya no pinta la lista, sino que enlaza a las 52 (rastreables) y ofrece «Ver mi papeleta
en X» si hay una recordada. La provincia sigue sin salir del navegador.

**D3 · Una sola fuente de datos** — la lista y las etiquetas salen de `candidaturas.yaml` y
`circunscripciones.yaml` por funciones puras (`lib/papeleta.ts`), con las mismas etiquetas que
el resto de la web. Las provincias desconocidas dan 404.

**D4 · Diputados** — de `lib/elecciones.ts` (anexo del decreto), con un mapa explícito para los
8 nombres del anexo que difieren de los del BOE. Un test comprueba que las 52 coinciden y suman
350.

**D5 · Fecha del BOE** — los datos solo guardan el identificador (BOE-A-…); no se guarda la
fecha, así que la página cita identificador y enlace, no la fecha. Guardarla exigiría ampliar el
cargador del BOE: queda como mejora, sin bloquear.

**D6 · Ficha de partido** — la sección «Dónde se presenta» sale de `circunscripciones` de cada
candidatura; si son todas, lo dice en una frase.

## Puerta de la constitución
| Principio | Cómo lo cumple este plan |
|---|---|
| I. Neutralidad | Todas las candidaturas del BOE, orden alfabético, mismo formato, color solo como acento, sin logotipos. |
| II. Grounding | Solo datos ya cargados del BOE y del decreto; se cita el identificador de cada uno. |
| III. Transparencia | Dice si son presentadas o proclamadas y de qué BOE salen. |
| IV. Asistente no opina | No aplica. |
| V. Accesibilidad | Un solo `h1`, lista semántica, nombre local en texto, objetivos táctiles de 44 px. |
| VI. Privacidad | La provincia solo se guarda en el navegador; las páginas no recogen datos. |
| VII. Calidad verificable | Tests de los datos y comprobación de las 52 páginas contra el registro. |

## Verificación por historia
| Historia | Cómo se verifica |
|---|---|
| HU-6.1 | Script que compara, en las 52 páginas, las candidaturas del registro con las de la página y con la cifra del texto (0 discrepancias). |
| HU-6.2 | Navegador: el selector lleva a la página; «Tu papeleta» enlaza a las 52. |
| HU-6.3 | Texto según `fase_inclusion`. |
| HU-6.4 | Título, descripción y migas en el HTML; 52 URLs en el sitemap; 404 para una provincia inventada. |
| HU-6.5 | Test: las 52 cifras coinciden con el anexo y suman 350. |
| HU-6.6 | Fichas de PP (51), VOX (52, «las 52») y Frente Amplio (47). |
| No funcionales | Madrid: 9 KB comprimida; sin scroll horizontal a 375 px. |

## Riesgos
| Riesgo | Mitigación |
|---|---|
| Que las 52 páginas se parezcan mucho entre sí | Título, descripción, cifra de diputados y lista propios en cada una. |
| Datos que cambian con la proclamación | Todo sale del registro: al reaplicar el BOE, las páginas se regeneran. |
