# Spec 001 · Datos, análisis, búsqueda y actualización de programas

- **Estado**: aprobada (5 oct 2026, con cambios: candidaturas según el BOE, vigilancia, RAG y
  validación de la lectura fácil)
- **Depende de**: [constitución](../constitution.md)

## Contexto

VotoClaro no analiza nada en tiempo real para el comparador: cada programa se procesa **una
vez**, se revisa y se publica. Esta spec define:
- qué datos existen;
- qué técnica se usa para analizar y buscar (incluido el RAG);
- cómo se garantiza que cada afirmación tiene fuente;
- cómo **nos enteramos** de las candidaturas y programas nuevos;
- cómo se sustituye un programa de 2023 por el del 29N.

## Convocatorias

| id | Nombre | Fecha | Papel |
|---|---|---|---|
| `generales-2023` | Elecciones generales 23J | 2023-07-23 | Referencia anterior (*fallback*) |
| `generales-2026` | Elecciones generales 29N | 2026-11-29 | Convocatoria principal |

### Calendario oficial que condiciona los datos (LOREG, convocatoria en el BOE del 6 de octubre)

| Fecha | Hito | Efecto en VotoClaro |
|---|---|---|
| hasta el 16 oct | Comunicación de coaliciones a las juntas electorales | Se vigilan los anuncios de coaliciones |
| 21-26 oct | Presentación de candidaturas (partidos, coaliciones y agrupaciones de electores) | Se vigilan los anuncios |
| ~28 oct | El BOE publica las **candidaturas presentadas** | Fin de la lista provisional: entran **todas** |
| 2-3 nov | **Proclamación** y publicación en el BOE | Lista definitiva: salen las no proclamadas |
| 13-27 nov | Campaña electoral | Pico de publicación de programas y de tráfico |

## Candidaturas

La unidad es la **candidatura** (partido, coalición o agrupación de electores): es lo que
aparece en la papeleta y lo que presenta un programa (constitución I.6). Están registradas en
[`data/candidaturas.yaml`](../../data/candidaturas.yaml), que se puede editar sin tocar código.

- **Fase provisional** (hasta el BOE del ~28 de octubre): las candidaturas con representación
  en las Cortes en la XV legislatura: PP, PSOE, VOX, Sumar, Podemos, ERC, Junts, EH Bildu,
  PNV, BNG, CC y UPN, más Más Madrid, Compromís, Geroa Bai, ASG y AHI si concurren por
  separado. Se muestra el aviso «Lista provisional».
- **Fase BOE**: se cargan **todas** las candidaturas al Congreso publicadas en el BOE, con las
  circunscripciones en que se presenta cada una. Así cada persona puede ver **su papeleta**
  (spec 002, HU-2.10).
- **Continuidad para el *fallback***: una candidatura de 2026 usa el programa de 2023 solo si
  el registro lo enlaza de forma explícita con una candidatura de 2023 con programa propio
  (por ejemplo, PP con PP). Si en 2023 concurrió dentro de otra candidatura (Podemos dentro de
  Sumar) o es nueva, **no hay *fallback***: se muestra «Pendiente del programa del 29N».
- **Sin programa**: una candidatura proclamada que no publica programa aparece con «No ha
  publicado programa electoral (comprobado el {fecha})».

## Temas

Hay 19 temas predefinidos con subtemas en [`data/topics.yaml`](../../data/topics.yaml). Añadir
un tema obliga a analizarlo para **todas** las candidaturas (simetría).

## Técnica de análisis y búsqueda: ¿RAG? (decisión)

Hay dos necesidades distintas y **cada una tiene su mejor técnica**:

### Para el comparador: extracción exhaustiva offline, sin RAG en tiempo real

El comparador afirma cosas como «el partido X no menciona la vivienda turística». Esa
afirmación solo es segura si **se ha leído todo el programa**. Un RAG clásico (recuperar los
*k* fragmentos más parecidos) pierde menciones dispersas: un programa habla de vivienda en el
capítulo de vivienda, pero también en el de juventud, en el de impuestos o en el de
despoblación.

**Decisión**: por cada candidatura × tema, el modelo lee **el programa completo** (cabe en el
contexto de los modelos actuales y la caché de *prompts* abarata repetirlo por tema) y extrae
las propuestas en un formato estructurado, con citas literales que luego se verifican.

Una **red de seguridad de exhaustividad**: cuando el resultado es «no lo menciona», se lanza
una búsqueda híbrida con los subtemas del tema. Si aparecen fragmentos relevantes, se
reanaliza ese tema y se avisa en el informe.

Ventajas: mejor exhaustividad, el mismo procedimiento para todos, coste único por programa y
páginas instantáneas.

### Para las preguntas libres: RAG agéntico, híbrido y simétrico

Las preguntas no se pueden prever, así que aquí **sí** se usa RAG, con las técnicas que mejor
funcionan hoy:

1. **Dos índices**:
   - **Propuestas**: las propuestas ya analizadas y verificadas del comparador (unas 2.500).
     Son unidades cortas y limpias, ideales para «¿quién propone bajar el IVA de la luz?».
   - **Fragmentos**: el texto completo de los programas, por si la pregunta va a un detalle
     que no está entre las propuestas extraídas.
2. **Recuperación contextual**: cada fragmento se indexa con su contexto (candidatura,
   convocatoria, capítulo y sección, página) para que «bajaremos este impuesto» no quede
   huérfano.
3. **Búsqueda híbrida**: búsqueda léxica en español (encuentra términos exactos como «IRPF»,
   «Ley 12/2023» o «MIR») más búsqueda semántica (encuentra «okupas» ↔ «ocupación ilegal»),
   fusionadas.
4. ***Reranking***: un modelo rápido reordena los ~40 candidatos y se quedan los 8 mejores.
5. **Simetría por diseño**: en preguntas sobre varias candidaturas, la búsqueda se hace **por
   candidatura** con el mismo presupuesto para cada una. Un RAG normal favorecería a los
   programas más largos.
6. **Agéntico**: el asistente decide qué herramientas usar. Primero consulta los análisis
   verificados del tema y después busca en el texto si hace falta, con un máximo de 4 pasos.
   Antes de buscar, reformula la consulta con sinónimos y términos legales.
7. **Validación de citas** en el servidor antes de mostrar nada (spec 003, HU-3.2).

**Descartado**:
- RAG solo vectorial: pierde términos exactos y sigla, y no es simétrico.
- Meter todos los programas en cada pregunta (*long context*): millones de *tokens* por
  pregunta, lento y caro.
- GraphRAG: caro, opaco y con poca ganancia sobre prosa política; además, es más difícil
  verificar las citas.
- *Fine-tuning*: los datos cambian cada semana en campaña y no aporta *grounding*.

**Cómo se mide**: con evals de recuperación (¿están las páginas correctas entre los 8
primeros?) y evals de respuesta (spec 003).

## Historias de usuario

### HU-1.1 Registrar un programa
**Como** mantenedor **quiero** registrar un programa indicando candidatura, convocatoria y URL
**para** que quede archivado con trazabilidad.
- El sistema descarga el documento, guarda una copia, calcula su SHA-256 y registra la URL
  original, la fecha de descarga y una copia en el archivo web (Wayback Machine).
- **Si el programa es una página web** (HTML) y no un PDF, se archiva como PDF con fecha,
  para que las citas tengan página y sean estables.
- Si la URL no es válida, falla con un mensaje claro y no registra nada.
- Si el documento ya está registrado con el mismo hash, no hace nada; si el hash cambia, el
  partido ha actualizado el programa y se avisa.

### HU-1.2 Extraer el texto
- Se extrae el texto por página, con las posiciones necesarias para resaltar fragmentos, la
  etiqueta de página impresa y la estructura de capítulos y secciones (para la recuperación
  contextual).
- Se aplica OCR solo si el PDF no tiene capa de texto.
- Se detecta el idioma. Si existe versión en castellano, se usa esa, y la original queda
  enlazada.

### HU-1.3 Analizar por tema
**Para cada** candidatura × tema se genera:
- `menciona`: sí o no. Si es «no», se activa la red de seguridad de exhaustividad.
- **Resumen**: de 1 a 3 frases y un máximo de 60 palabras. Cada frase con al menos 1 cita.
- **Propuestas concretas**: hasta 8, cada una con su subtema y al menos 1 cita, priorizando
  las más concretas (cifras, plazos, leyes).
- Los mismos límites para todas las candidaturas.

### HU-1.4 Lectura fácil
- Cada resumen y cada propuesta tiene una versión de lectura fácil que hereda sus citas y no
  puede añadir información.
- **Validación automática**, que bloquea la publicación si no se cumple. Son reglas derivadas
  de la norma UNE 153101 EX:
  - frases de 20 palabras como máximo (objetivo: 15);
  - una idea por frase;
  - índice de legibilidad INFLESZ de 65 o más («bastante fácil»);
  - palabras poco frecuentes y siglas sustituidas o explicadas;
  - números en cifras;
  - sin dobles negaciones.
- **Validación de fidelidad**: un juez automático comprueba que la versión fácil no añade, no
  quita lo esencial ni cambia el sentido de la versión normal.
- **Validación humana** (la que exige la norma), con una entidad especializada y personas con
  dificultades de comprensión lectora:
  - **Fase 1**: textos de la interfaz, descripciones de los 19 temas y una muestra
    representativa de análisis.
  - **Fase 2**: ajustar el *prompt* y las reglas con lo aprendido y regenerar.
  - Hasta completarla, el modo se etiqueta «Lectura fácil · adaptación automática», sin el
    logotipo oficial.

### HU-1.5 Verificar las citas (*grounding*)
- Cada cita contiene un fragmento **literal** que se verifica contra el texto extraído de su
  página (normalizado; skill `grounding`). Se calculan sus rectángulos de resaltado.
- Un análisis con **alguna** cita sin verificar no puede pasar a `aprobado`, y la CI lo
  bloquea.
- Un revisor con IA y la revisión humana comprueban que la cita **respalda** la afirmación.

### HU-1.6 Revisar y aprobar
- Cada ingesta produce un **informe de revisión** en el PR: cobertura de temas, temas sin
  mención con el resultado de la red de seguridad, porcentaje de citas verificadas, avisos de
  neutralidad, legibilidad de la lectura fácil, coste y modelos.
- Se aprueba haciendo merge del PR. Hasta entonces es `borrador` y no se ve en la web.
- Los programas de 2023 (referencia) se aprueban en un único PR; los del 29N, en uno por
  candidatura.

### HU-1.7 Pasar de 2023 al 29N ⭐
Estados por candidatura y convocatoria:

```
pendiente ──► publicado ──► analizado ──► aprobado
(sin documento) (archivado)  (borrador en PR) (merge: visible en la web)
```

**Regla de visualización**: se muestra el programa **aprobado más reciente**.
- Mientras el del 29N no esté aprobado y haya continuidad, se muestra el de 2023 con el aviso
  «Programa de 2023 (anterior) · pendiente del programa del 29N».
- Al aprobarse, cambian a la vez el comparador, la ficha, las páginas de tema y el chat.
- El de 2023 sigue consultable desde la ficha («Ver programa de 2023») y en el chat, si se
  pregunta por él.
- La metodología muestra el estado y las fechas de cada candidatura.

**Procedimiento** (detallado en la skill `ingest-program`):
1. Se detecta el programa: por la vigilancia (HU-1.10) o a mano.
2. Se lanza la ingesta con el botón de GitHub Actions o con `/ingest-program`. La vigilancia
   la puede lanzar sola.
3. El pipeline abre un PR con el informe en menos de 30 minutos.
4. Revisión humana y merge.
5. Despliegue automático.

Objetivo: **menos de 24 h** desde que se publica el programa hasta que está en la web.

### HU-1.8 Corregir errores
- Se reporta desde la web con una *issue* ya rellenada. Se corrige por PR, con la misma
  verificación.

### HU-1.9 Reproducibilidad
- Se registran el modelo, la versión del *prompt*, la fecha, el hash del documento y el
  coste.
- Un análisis aprobado no se sobrescribe sin `--force` explícito.

### HU-1.10 Vigilancia: enterarse a tiempo ⭐
**Como** mantenedor **quiero** que el sistema me avise en cuanto aparezca una candidatura o un
programa **para** no depender de revisarlo a mano.

- **Programas**: varias veces al día, hasta el 27 de noviembre, se comprueba:
  - las páginas de cada candidatura donde suele publicar el programa (`vigilar` en el
    registro), buscando documentos nuevos o cambios de hash;
  - una búsqueda de noticias por candidatura («programa electoral» + nombre).
- **Candidaturas**: cada día, del 16 de octubre al 3 de noviembre, se revisa el **sumario del
  BOE** (API de datos abiertos) en busca de candidaturas presentadas y proclamadas, y las
  noticias de coaliciones y agrupaciones nuevas.
- Cuando se detecta algo:
  - se abre una *issue* de GitHub («Posible programa nuevo: X», con el enlace), que te llega
    como notificación;
  - si es un documento del dominio oficial, se lanza la ingesta automáticamente y queda en un
    PR **en borrador**. Nunca se publica sin merge humano.
  - si es el BOE, se abre un PR que actualiza `candidaturas.yaml` con las candidaturas y sus
    circunscripciones.
- La metodología muestra la fecha de la última comprobación de cada candidatura.

## Requisitos no funcionales

- **Auditabilidad**: los análisis son ficheros de texto en git, revisables por *diff*.
- **Coste**: se registra en cada ejecución; el total debería quedarse en decenas de euros.
- **Tiempo**: menos de 30 minutos por ingesta.

## Criterios de aceptación globales

- [ ] Los programas de 2023 de las candidaturas con continuidad están `aprobados`.
- [ ] El 100 % de las citas publicadas están verificadas.
- [ ] Todas las combinaciones candidatura × tema tienen análisis o «no menciona» (con la red
      de seguridad ejecutada).
- [ ] La lectura fácil supera la validación automática en el 100 % de los textos.
- [ ] La vigilancia detecta un documento nuevo de prueba y abre la *issue* y el PR en
      borrador.
- [ ] Al cargar el BOE de candidaturas presentadas, `candidaturas.yaml` refleja todas las
      candidaturas con sus circunscripciones.

## Fuera de alcance (v1)

- El Senado: las papeletas del Senado son de personas; se usa el programa de su candidatura.
- Programas autonómicos, municipales o europeos.
- Fuentes distintas del programa oficial.
