# Spec 007 · Una portada que enseña lo que hay

- **Estado**: aprobada (11 nov 2026)
- **Decisiones del propietario en el chat (11 nov 2026)**: aprueba la spec; la fecha que se
  muestra es la de carga en VotoClaro («disponible desde el {fecha}»).
- **Depende de**: [constitución](../constitution.md), [spec 002](../002-comparador/spec.md)
  (HU-2.6 «Estado del programa siempre visible», HU-2.10 «Tu papeleta»),
  [spec 003](../003-chat/spec.md) (chat) y [spec 006](../006-candidaturas-por-provincia/spec.md).
- **Petición del propietario (11 nov)**: «la portada es coja; da sensación de que solo
  tenemos esos». Elige las tres mejoras propuestas.
- **Constitución**: sin cambios. Comprobada abajo.

## Contexto

Desde el 10 de noviembre ya hay cuatro programas del 29N (BNG, CC, ERC y PP), pero la portada no
lo cuenta: tras el titular, lo primero es la tira «4 de 15 partidos han publicado ya su programa
del 29N», que se lee como lo que **falta**, y una rejilla donde casi todos dicen «Programa de
2023 (anterior) · pendiente del 29N». No aparecen ni el chat ni «Tu papeleta» con sus 52
provincias, que son lo que distingue a VotoClaro.

Lo que de verdad hay hoy, entre las 15 candidaturas principales: **11 se pueden comparar**,
4 con su programa del 29N y 7 con el de 2023; las otras 4 aún no tienen programa propio que
mostrar.

## Usuarios

- **Votante que llega por primera vez**: necesita entender en segundos qué puede hacer aquí y
  que hay contenido real.
- **Votante que vuelve**: quiere ver qué hay nuevo (qué partidos han publicado ya).

## Historias de usuario

### HU-7.1 Lo que puedes hacer, a la vista
**Como** votante que llega **quiero** ver las formas de usar la web **para** empezar por la que
me sirva.
- Justo debajo del titular, tarjetas del mismo tamaño y formato:
  - **Compara por temas**: lleva al comparador.
  - **Pregúntale a la IA**: lleva al chat, con un ejemplo de pregunta neutral que nombra un tema
    y no un partido («¿Qué proponen los partidos sobre vivienda?»). Solo aparece si el chat está
    activo; si no, quedan dos tarjetas.
  - **Tu papeleta**: con el selector de provincia en la propia tarjeta; elegir una lleva a su
    página (spec 006). La provincia se recuerda solo en el navegador (HU-2.10).
- Cada tarjeta dice en una frase qué hace, sin adjetivos valorativos.

### HU-7.2 Programas del 29N ya publicados
**Como** votante **quiero** ver qué partidos han publicado ya su programa del 29N **para** saber
qué hay de nuevo.
- Bloque «Programas del 29N ya publicados» con las candidaturas principales que ya lo tienen,
  en **orden alfabético**, todas con el mismo formato: nombre, «Programa 29N», número de
  páginas, «disponible desde el {fecha de carga en VotoClaro}» y enlace a su ficha.
- Debajo, una línea «Aún sin programa del 29N: …» con las demás principales, en orden
  alfabético y enlazadas a su ficha.
- Si aún no hay ninguno, el bloque no aparece. Si ya están todos, desaparece la línea de
  pendientes.
- Los datos salen del registro y de los programas aprobados: al aprobar uno nuevo, el bloque se
  actualiza solo.

### HU-7.3 Una cifra que cuenta lo que hay
**Como** votante **quiero** saber cuánto puedo comparar ya **para** confiar en que la web está
completa.
- La tira actual pasa a decir, con cifras de los datos: «Ya puedes comparar {N} de los {T}
  partidos principales: {A} con su programa del 29N y {B} con el de 2023», con el enlace «Ver
  estado» a la metodología.
- Mientras quede alguno con el programa de 2023 se mantiene el aviso de que se muestra el
  anterior y se indica (constitución III.2).

## Orden de la portada

Titular y botones → tira (HU-7.3) → tarjetas (HU-7.1) → programas del 29N publicados (HU-7.2)
→ temas → partidos → cómo funciona → cómo se mantiene. Lo demás no cambia.

## Comprobación contra la constitución

- **I.2 Simetría**: el bloque de publicados es informativo, en orden alfabético y con el mismo
  formato para todos; no ordena por fecha ni destaca a quien publicó antes.
- **I.4 Sin rankings**: la cifra cuenta programas disponibles, no valora a nadie.
- **I.5 Igualdad visual**: color solo como acento junto al nombre; sin logotipos.
- **III.1 y III.2 Transparencia**: cada partido dice de qué programa sale lo que se ve; la tira
  mantiene el aviso del programa de 2023.
- **IV**: el ejemplo de pregunta del chat no nombra a ningún partido.
- **VI Privacidad**: el selector de provincia no envía nada; se guarda solo en el navegador.

## Requisitos no funcionales

- La portada sigue siendo estática; el peso comprimido no crece más de un 20 % (subido del 15 % el
  11 nov con aprobación del propietario: el selector de las 52 provincias lleva la portada de 19,9 a
  23 KB, +16 %, imperceptible incluso con conexión lenta).
- Accesibilidad WCAG 2.2 AA; tarjetas navegables por teclado; objetivos táctiles de 44 px.
- Sin scroll horizontal a 375 px; en móvil, las tarjetas van una debajo de otra.

## Criterios de aceptación

- [ ] Tres tarjetas (dos si el chat no está activo), iguales en tamaño y formato.
- [ ] El selector de la tarjeta de Tu papeleta lleva a `/tu-papeleta/{provincia}`.
- [ ] El bloque lista BNG, CC, ERC y PP en orden alfabético, con páginas, fecha de carga y
      enlace; la línea de pendientes lista las demás principales.
- [ ] La tira dice «Ya puedes comparar 11 de los 15 partidos principales: 4 con su programa
      del 29N y 7 con el de 2023» (con los datos de hoy) y mantiene el aviso de 2023.
- [ ] Revisión de neutralidad: nada ordena por fecha ni destaca a un partido.
- [ ] Escritorio y 375 px revisados en el navegador.

## Fuera de alcance

- Noticias, resúmenes o valoraciones de los programas en la portada.
- Imágenes o logotipos de los partidos.
- Animaciones de contador.

## Preguntas abiertas

Ninguna (la fecha se resolvió el 11 nov: fecha de carga).
