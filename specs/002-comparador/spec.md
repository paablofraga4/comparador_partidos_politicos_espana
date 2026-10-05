# Spec 002 · Comparador web

- **Estado**: borrador · pendiente de aprobación
- **Depende de**: [constitución](../constitution.md) · [001 datos](../001-datos-y-analisis/spec.md)

## Contexto

Es la cara pública del proyecto. Debe ser **bonita, amigable y muy sencilla** para alguien
que nunca ha leído un programa electoral, y a la vez **rigurosa**: cada frase lleva a su
fuente con un clic.

## Usuarios

- **Votante curioso** (principal): en el móvil, con poco tiempo, quiere saber «qué propone X
  sobre vivienda» o «en qué se diferencian A y B».
- **Persona indecisa**: compara varios partidos en los temas que le importan.
- **Persona con dificultades de lectura o personas mayores**: usan el modo de lectura fácil.
- **Periodista o persona escéptica**: quiere comprobar la fuente literal.

## Mapa de páginas

| Ruta | Para qué |
|---|---|
| `/` | Inicio: dos entradas («Comparar partidos» y «Conocer un partido»), rejilla de temas, estado de los programas y acceso al chat |
| `/comparar?partidos=…&temas=…` | Comparador. El estado vive en la URL, así que cualquier selección se puede compartir |
| `/partidos/[partido]` | Ficha del partido con todos los temas |
| `/temas/[tema]` | Todos los partidos en un tema |
| `/programas/[partido]/[convocatoria]` | Visor del documento completo (`?pagina=47&cita=c12`) |
| `/pregunta` | Chat (spec 003) |
| `/metodologia` | Cómo se hace, criterios, estado de los programas y cómo reportar errores |

## Historias de usuario

### HU-2.1 Elegir partidos y temas sin esfuerzo
- La selección de partidos se hace con *chips* (nombre y punto de color) de 1 a N partidos;
  la de temas, con *chips* con icono, de 1 a N temas.
- Con **1 partido**, la vista pasa a «Conocer un partido» (la ficha); con **2 o más**, se
  muestra la comparativa.
- Atajos: «Todos los partidos» y «Los 5 temas más consultados».
- En móvil, la selección es un flujo de 2 pasos (partidos → temas) con un botón fijo
  «Comparar».

### HU-2.2 Ver la comparativa
- **Escritorio**: una fila por tema y una columna por partido. Por encima de 4 partidos,
  desplazamiento horizontal con la columna del tema fija.
- **Móvil**: un tema cada vez; los partidos se muestran como tarjetas deslizables, con un
  indicador «2/5».
- Cada celda tiene resumen, propuestas plegables («Ver 6 propuestas») y la etiqueta del
  programa de origen.
- El orden es alfabético (constitución I.2).

### HU-2.3 Cada frase lleva a su fuente ⭐
- Cada frase del resumen y cada propuesta lleva **marcas de cita** discretas (por ejemplo,
  «p. 47»), con estilo de subrayado de rotulador.
- Al pulsar una cita se abre un **panel de fuente** (lateral en escritorio, a pantalla
  completa en móvil) con:
  - la **página del PDF** renderizada y el fragmento **resaltado**;
  - el fragmento literal en texto, que se puede copiar;
  - partido, convocatoria y página impresa;
  - los botones «Abrir documento completo» (visor en esa página) y «Ver en la web del
    partido» (URL original).
- El panel se cierra con Esc o con «atrás», y se puede usar con teclado y lector de
  pantalla («Fuente: programa del PP, página 47»).

### HU-2.4 Visor del documento
- Muestra el PDF completo, con navegación por páginas, zoom y el fragmento de la cita
  resaltado si viene en la URL.
- Funciona en móvil.
- Indica el hash del documento y la fecha de archivo, y enlaza a la copia de la Wayback
  Machine.

### HU-2.5 Modo lectura fácil
- Un interruptor global, siempre visible en la cabecera, que se recuerda en el navegador.
- Sustituye los resúmenes y propuestas por su versión de lectura fácil y aumenta el tamaño
  del texto y el espaciado.
- Las citas siguen visibles y funcionando igual.

### HU-2.6 Estado del programa siempre visible
- Cada tarjeta o columna indica su origen: «Programa 29N · publicado el 10 nov», o el aviso
  de programa de 2023 (constitución III.2).
- En el inicio, una tira con el estado de los programas («9 de 14 partidos han publicado ya
  su programa del 29N») que enlaza a la metodología.

### HU-2.7 Cuando un partido no habla de un tema
- Se muestra «No lo menciona en su programa», en un estilo neutro (ni rojo ni de error), con
  un enlace al documento por si la persona quiere comprobarlo.

### HU-2.8 Reportar un error
- En cada propuesta, un enlace discreto «¿Ves un error?» abre una *issue* de GitHub ya
  rellenada (partido, tema, propuesta y cita).

### HU-2.9 Encontrable y compartible
- Las páginas de tema y de partido son indexables, con título y descripción propios.
- Tienen metadatos Open Graph básicos (texto). Las imágenes generadas para redes quedan
  fuera de la v1.

## Diseño: «editorial cívico»

- Inspirado en un medio digital moderno: titulares con serifa, cuerpo sans muy legible, mucho
  espacio en blanco, papel cálido y tinta oscura.
- El **subrayado de rotulador** es el motivo de marca: se usa en las citas y en los
  fragmentos resaltados del PDF, porque «aquí está la fuente» es nuestra promesa.
- Los colores de los partidos, solo como acentos (constitución I.5).
- Animaciones sutiles y funcionales (transiciones de panel, aparición de tarjetas) que
  respetan `prefers-reduced-motion`.
- Modo oscuro.
- El sistema de diseño concreto está en la skill `editorial-design`.

## Requisitos no funcionales

- **Accesibilidad**: WCAG 2.2 AA, verificada con axe en los tests e2e; objetivos táctiles de
  al menos 44 px; foco visible.
- **Rendimiento**: páginas del comparador estáticas o regeneradas; LCP < 2,5 s en 4G y
  CLS < 0,1; el visor de PDF se carga bajo demanda.
- **Compatibilidad**: las dos últimas versiones de Chrome, Safari (también iOS), Firefox y
  Edge.
- **Idioma de la interfaz**: castellano en la v1.

## Criterios de aceptación

- [ ] Desde el inicio, una persona llega a «PP vs PSOE en vivienda» en 3 toques o menos en
      móvil.
- [ ] El 100 % de las afirmaciones visibles tienen una cita que abre el panel con el
      fragmento resaltado en la página correcta (test e2e con muestreo).
- [ ] El modo de lectura fácil cambia todo el contenido analizado y se mantiene al navegar.
- [ ] Todas las tarjetas muestran el programa de origen; las de 2023 llevan su aviso.
- [ ] axe no da violaciones serias ni críticas en las páginas principales.
- [ ] La comparativa con 6 partidos se usa con comodidad en una pantalla de 375 px.

## Fuera de alcance (v1)

- El test «¿con quién coincides?».
- Las imágenes generadas para compartir en redes.
- Otros idiomas de interfaz (catalán, euskera, gallego, inglés).
- Las cuentas de usuario y los favoritos.

## Preguntas abiertas

1. **Nombre del producto**: propuestas «Qué Proponen», «Con Lupa» y «Programa a Programa».
   El dominio lo comprarás tú más adelante.
