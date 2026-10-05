# Spec 001 · Datos, análisis y actualización de programas

- **Estado**: borrador · pendiente de aprobación
- **Depende de**: [constitución](../constitution.md)

## Contexto

La web no analiza nada en tiempo real: cada programa se procesa **una vez**, se revisa y se
publica. Esta spec define qué datos existen, cómo se generan los análisis por tema, cómo se
garantiza que cada afirmación tiene fuente y **cómo se sustituye un programa de 2023 por el
del 29N** cuando un partido lo publica.

## Convocatorias

| id | Nombre | Fecha | Papel |
|---|---|---|---|
| `generales-2023` | Elecciones generales 23J | 2023-07-23 | Referencia anterior (*fallback*) |
| `generales-2026` | Elecciones generales 29N | 2026-11-29 | Convocatoria principal |

## Partidos

Criterio: representación en las Cortes en la XV legislatura, más Sumar. Registro editable en
[`data/parties.yaml`](../../data/parties.yaml); añadir o quitar un partido no requiere tocar código.

- **Estatales**: PP, PSOE, VOX, Sumar y Podemos.
- **Autonómicos**: ERC, Junts, EH Bildu, PNV, BNG, CC y UPN.
- **Solo si publican programa propio de generales**: Geroa Bai, ASG y AHI.
- **Más Madrid y Compromís**: en 2023 concurrieron dentro de Sumar. En el 29N aparecerán
  por separado solo si se presentan con candidatura y programa propios.

La lista final del 29N se cierra con las coaliciones inscritas (hasta el 16 de octubre) y la
proclamación de candidaturas.

**Regla de *fallback* con coaliciones**: si un partido concurrió en 2023 dentro de otra
candidatura (por ejemplo, Podemos dentro de Sumar), **no** se le asigna el programa de esa
coalición como propio. Se muestra «Pendiente del programa del 29N», con la nota «En 2023
concurrió dentro de Sumar».

## Temas

Hay 19 temas predefinidos, cada uno con subtemas, en [`data/topics.yaml`](../../data/topics.yaml).
Son editables: añadir un tema implica volver a analizar ese tema para todos los partidos, por
simetría.

Vivienda · Economía y empleo · Impuestos · Pensiones · Protección social · Sanidad ·
Educación · Inmigración · Medio ambiente y energía · Mundo rural · Transporte ·
Igualdad · Familia y conciliación · Juventud · Ciencia y digitalización ·
Seguridad y justicia · Modelo territorial · Regeneración democrática ·
Política exterior, UE y defensa

## Historias de usuario

### HU-1.1 Registrar un programa
**Como** mantenedor **quiero** registrar un programa indicando partido, convocatoria y URL
**para** que quede archivado con trazabilidad.

- El sistema descarga el PDF, guarda una copia, calcula su SHA-256 y registra la URL
  original, la fecha de descarga y una copia en el archivo web (Wayback Machine).
- Si la URL no devuelve un PDF válido, falla con un mensaje claro y no registra nada.
- Si el PDF ya está registrado con el mismo hash, no hace nada.

### HU-1.2 Extraer el texto
- Se extrae el texto **por página**, con las posiciones necesarias para resaltar fragmentos
  y la etiqueta de página impresa si existe.
- Se detectan los PDFs escaneados (sin capa de texto) y se aplica OCR, marcando el documento
  como «OCR».
- Se detecta el idioma. Si el partido publica versión en castellano, se usa esa, y la
  original queda enlazada.

### HU-1.3 Analizar por tema
**Para cada** partido × tema se genera:
- `menciona`: sí o no. Si es «no», no hay más campos y la web muestra «No lo menciona en su
  programa».
- **Resumen**: de 1 a 3 frases y un máximo de 60 palabras. Cada frase con al menos 1 cita.
- **Propuestas concretas**: hasta 8, cada una con su subtema y al menos 1 cita, y priorizando
  las medidas más concretas (cifras, plazos, leyes).
- Los mismos límites para todos los partidos (simetría).

### HU-1.4 Lectura fácil
- Cada resumen y cada propuesta tiene una versión de lectura fácil: frases cortas,
  vocabulario común, una idea por frase y sin siglas sin explicar.
- Hereda las citas de la versión normal; no puede añadir información que no esté en ella.
- Se muestra con el aviso «Adaptación automática a lectura fácil».

### HU-1.5 Verificar las citas (*grounding*)
- Cada cita contiene un fragmento **literal** del documento. Se verifica comparando con el
  texto extraído de esa página, normalizando espacios, guiones de fin de línea y comillas.
- Para cada cita verificada se calculan los rectángulos de resaltado de la página.
- Un análisis con **alguna** cita no verificada no puede pasar a `aprobado`, y la CI lo
  bloquea.
- Un segundo control (revisor con IA y revisión humana) comprueba que la cita **respalda**
  la afirmación y no solo que exista.

### HU-1.6 Revisar y aprobar
- Cada ingesta produce un **informe de revisión** legible en el PR, que incluye:
  - cobertura de temas, con los temas que no se mencionan;
  - el porcentaje de citas verificadas;
  - avisos de neutralidad: adjetivos valorativos y extensiones desiguales frente a la media;
  - el coste y los modelos usados;
  - un enlace de cada propuesta a su cita.
- El mantenedor aprueba haciendo merge del PR. Hasta entonces el análisis es `borrador` y
  no se muestra en la web.

### HU-1.7 Pasar de 2023 al 29N ⭐
Cada partido tiene, por convocatoria, uno de estos estados:

```
pendiente ──► publicado ──► analizado ──► aprobado
(sin PDF)     (PDF archivado) (borrador en PR) (merge: visible en la web)
```

**Regla de visualización**: en cada partido se muestra el programa **aprobado más reciente**.
- Mientras el del 29N no esté `aprobado`, se muestra el de 2023 con el aviso «Programa de
  2023 (anterior) · pendiente del programa del 29N».
- Al aprobarse el del 29N, cambian **a la vez** todas las vistas (comparador, ficha del
  partido, páginas de tema y chat), sin tocar código.
- El programa de 2023 sigue disponible desde la ficha del partido («Ver programa de 2023») y
  en el chat, preguntando explícitamente por 2023.
- La página de metodología muestra una tabla con el estado de cada partido y sus fechas:
  publicado, analizado y aprobado.

**Procedimiento operativo** cuando un partido publica su programa:
1. Se lanza la ingesta con el partido, la convocatoria y la URL, de dos formas posibles:
   el botón *Run workflow* de GitHub Actions (también desde el móvil) o el comando local
   `/ingest-program`.
2. El pipeline descarga, extrae, analiza y verifica, y abre un PR «Programa 29N · {partido}»
   con el informe de revisión. Objetivo: menos de 30 minutos.
3. Revisión humana del PR.
4. Merge → despliegue automático en Railway → el contenido nuevo está en la web.

**Objetivo**: menos de 24 h desde que un partido publica su programa hasta que está en la web.

### HU-1.8 Corregir errores
- Cualquier persona puede reportar un error desde la web, lo que crea una *issue* de GitHub
  ya rellenada con el partido, el tema y la propuesta.
- Las correcciones se hacen por PR, pasan la misma verificación y quedan en el historial.

### HU-1.9 Reproducibilidad
- Cada análisis registra el modelo, la versión del prompt, la fecha, el hash del documento y
  el coste.
- Volver a ejecutar el análisis no sobrescribe uno `aprobado` salvo con `--force`
  explícito.

## Requisitos no funcionales

- **Auditabilidad**: los análisis son ficheros de texto en git, revisables por *diff*.
- **Coste**: se registra el coste de cada ejecución; el total de las dos convocatorias
  debería quedarse en decenas de euros.
- **Tiempo**: la ingesta completa de un programa tarda menos de 30 minutos.

## Criterios de aceptación globales

- [ ] Los 13-16 partidos tienen su programa de 2023 en estado `aprobado` (o «sin programa
      propio» documentado).
- [ ] El 100 % de las citas publicadas están verificadas.
- [ ] Todas las combinaciones partido × tema tienen análisis o «no menciona».
- [ ] Ningún resumen ni propuesta supera los límites de extensión.
- [ ] Una ingesta de prueba de un programa del 29N recorre todo el flujo hasta el PR.

## Fuera de alcance (v1)

- Vigilancia automática de las webs de los partidos para detectar programas nuevos (se puede
  añadir después).
- Programas autonómicos, municipales o europeos.
- Fuentes distintas del programa oficial.

## Preguntas abiertas

1. **Lectura fácil**: la norma UNE 153101 EX exige validación con personas con dificultades
   de comprensión. ¿Llamamos al modo «Lectura fácil», con el aviso de adaptación automática,
   o «Lenguaje sencillo»?
2. **SALF y otras candidaturas** sin representación actual: propongo mantener el criterio
   objetivo de representación en las Cortes y publicarlo.
