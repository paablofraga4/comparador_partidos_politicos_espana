# Spec 006 · Candidaturas por provincia

- **Estado**: aprobada (4 nov 2026)
- **Decisiones del propietario en el chat (4 nov 2026)**: aprueba la spec y las tres
  recomendaciones de «Preguntas abiertas» (número de diputados por provincia, provincias en la
  ficha de cada partido y comparador con la provincia ya elegida).
- **Depende de**: [constitución](../constitution.md), [spec 001](../001-datos-y-analisis/spec.md)
  (candidaturas del BOE) y [spec 002](../002-comparador/spec.md) (HU-2.10 «Tu papeleta» y
  HU-2.9 «Encontrable y compartible»).
- **Constitución**: sin cambios. Comprobada abajo.

## Contexto

Desde que el BOE publicó las candidaturas (28 oct), VotoClaro es de las pocas webs que sabe qué
candidaturas se presentan en **cada provincia**. Hoy ese dato está en «Tu papeleta», pero
detrás de un selector en una sola dirección: un buscador no puede indexar «candidaturas en
Madrid» ni «quién se presenta en Zaragoza», que es justo lo que la gente busca.

Datos de Search Console (6 oct – 4 nov): 2.295 clics en la web, y el 47 % viene de **una sola
página** (`/partidos/pp/pensiones`) y de una sola búsqueda («qué propone el pp para las
pensiones», 616 clics). Esa dependencia es frágil: una búsqueda, un partido, un tema. Las
páginas por provincia abren decenas de búsquedas nuevas, con datos oficiales y propios, y no
dependen de que salga o no el programa de ningún partido.

La web de la competencia más directa (29nov.es) aún no usa la lista oficial del BOE.

## Usuarios

- **Votante que busca su papeleta**: quiere saber qué candidaturas puede votar en su provincia,
  sin tener que usar un selector.
- **Persona que llega desde un buscador** con «candidaturas {provincia} 29N»: necesita la
  respuesta en la propia página y poder pasar a los programas.

## Historias de usuario

### HU-6.1 Una página por circunscripción
**Como** votante **quiero** una página con las candidaturas al Congreso de mi provincia
**para** saber qué papeletas habrá, con su fuente.
- Hay una página por cada circunscripción de la lista del BOE (las 50 provincias, Ceuta y
  Melilla), con dirección propia y el nombre de la provincia.
- Título: «Candidaturas al Congreso en {provincia}: quién se presenta el 29N». Un solo título
  principal visible, con el mismo texto.
- Un párrafo inicial dice, con cifras de los datos: cuántas candidaturas se presentan y que la
  fuente es el BOE, con su identificador (BOE-A-…) y un enlace.
- Lista **en orden alfabético**, sin destacar ninguna. Cada candidatura muestra su nombre, el
  nombre con que concurre en esa provincia si es distinto («En tu papeleta: UPN-PP»), el
  origen de su programa (el mismo texto que en «Tu papeleta») y un enlace a su ficha.
- Botón «Comparar las candidaturas de mi papeleta», que abre el comparador con ellas.
- Enlaces a las provincias vecinas o a la lista completa, para seguir navegando.
- Si una candidatura no ha publicado programa, aparece igualmente con la misma etiqueta que
  en el resto de la web (constitución I.6).

### HU-6.2 Acceso desde «Tu papeleta»
**Como** votante **quiero** llegar a mi provincia desde «Tu papeleta» **para** no buscarla.
- «Tu papeleta» incluye la lista completa de provincias como **enlaces**, además del selector.
- Elegir una provincia en el selector lleva a su página. La provincia se sigue recordando solo
  en el navegador y nunca sale de él (HU-2.10).

### HU-6.3 Siempre fiel a la fase del BOE
**Como** votante **quiero** que la página diga si son candidaturas presentadas o proclamadas
**para** no creer que son definitivas si no lo son.
- Con las **presentadas** (fase actual): «Candidaturas presentadas, según el BOE ({identificador}).
  Se proclaman el 2 y 3 de noviembre».
- Con las **proclamadas**: «Candidaturas proclamadas, según el BOE ({identificador})». Las no
  proclamadas desaparecen de la lista, igual que en el resto de la web (spec 001).
- El cambio de fase actualiza todas las provincias a la vez, sin tocar cada una.

### HU-6.4 Encontrable
**Como** persona que busca en Google **quiero** que estas páginas salgan en los resultados
**para** llegar a ellas directamente.
- Son indexables, con título, descripción y dirección canónica propios y migas de pan
  (inicio › Tu papeleta › {provincia}), como el resto (HU-2.9).
- Están en el `sitemap.xml`.
- La descripción incluye el número de candidaturas y la fuente; no hay texto repetido idéntico
  en las 52 páginas más allá de lo inevitable.

### HU-6.5 Cuántos diputados se eligen
**Como** votante **quiero** saber cuántos diputados elige mi provincia **para** entender qué
se vota.
- La página dice «Se eligen N diputados» con la cifra del anexo del Real Decreto 806/2026
  (BOE-A-2026-20742), la misma que ya usa la guía de las elecciones (HU-2.12), y cita esa
  fuente. Ceuta y Melilla eligen uno cada una.

### HU-6.6 Desde la ficha de cada partido
**Como** persona que mira una candidatura **quiero** ver en qué provincias se presenta
**para** saber si puedo votarla.
- La ficha de cada candidatura lista, con enlace a su página, las provincias en que concurre
  según el BOE, en orden alfabético. Es igual para todas: si es la misma en todas las
  provincias (PP, PSOE, VOX) se dice «Se presenta en las 52 circunscripciones» sin listarlas.

## Comprobación contra la constitución

- **I.2 Simetría**: mismo formato para todas, orden alfabético, ninguna destacada; las
  candidaturas locales pequeñas reciben el mismo trato que las grandes (aquí **todas** las del
  BOE, sin la separación de «principales» del comparador, porque el criterio es la papeleta).
- **I.5 Igualdad visual**: color solo como acento junto al nombre; sin logotipos.
- **I.6 Criterio objetivo**: única fuente, el BOE; se cita su identificador y se enlaza (la fecha no se guarda en los datos: mejora pendiente del cargador del BOE).
- **II Grounding**: solo datos oficiales ya cargados; no se escribe nada de memoria.
- **III Transparencia**: se dice la fase (presentadas/proclamadas) y la fecha del BOE.
- **VI Privacidad**: sin cuentas ni seguimiento; la provincia elegida sigue sin salir del
  navegador. Las páginas por provincia no recogen datos de quien las visita.
- **IV, V**: no aplican (no hay chat ni valoraciones).

## Requisitos no funcionales

- **Rendimiento**: páginas estáticas y ligeras; cada una, menos de 40 KB comprimida y
  carga completa en menos de 2 s en móvil con conexión normal.
- **Accesibilidad**: WCAG 2.2 AA; el nombre con que concurre cada candidatura nunca depende
  del color; la lista es navegable por teclado y lector de pantalla.
- **Móvil**: sin scroll horizontal a 375 px.
- **Datos**: salen de los mismos ficheros que «Tu papeleta»; si el BOE se reaplica, las
  páginas cambian solas.

## Criterios de aceptación

- [ ] Existen 52 páginas, una por circunscripción, y cada una lista exactamente las
      candidaturas del BOE de esa provincia, en orden alfabético.
- [ ] El número de candidaturas del texto inicial coincide con el de la lista.
- [ ] Cada candidatura enlaza a su ficha y muestra su etiqueta de programa y, si difiere, el
      nombre local en la papeleta.
- [ ] «Tu papeleta» lleva a la página de la provincia elegida y enlaza a las 52.
- [ ] Con la fase «proclamadas», las no proclamadas no aparecen y el texto lo dice.
- [ ] Título, descripción, canónica y migas correctos; las 52 en el `sitemap.xml`.
- [ ] Menos de 40 KB comprimida y sin scroll horizontal a 375 px.
- [ ] Cada página dice cuántos diputados se eligen, con la cifra del decreto.
- [ ] La ficha de cada candidatura enlaza a sus provincias (o dice «las 52»).
- [ ] Revisión de neutralidad: ninguna página destaca ni ordena por tamaño o color.

## Fuera de alcance

- Las listas al **Senado** y los nombres de las personas candidatas (solo se muestran
  candidaturas, no personas).
- Resultados anteriores, encuestas, estimaciones de escaños o cualquier valoración.
- Mapas o gráficos por provincia.
- Páginas por municipio o por comunidad autónoma.

## Preguntas abiertas

Ninguna (resueltas el 4 nov, ver HU-6.5 y HU-6.6; la tercera ya está en HU-6.1).
