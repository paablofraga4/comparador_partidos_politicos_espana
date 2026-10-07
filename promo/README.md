# VotoClaro · vídeo promocional

El vídeo se hace con [Remotion](https://www.remotion.dev), a partir de capturas reales de la web.
Hay dos formatos con el mismo guion: **16:9** (web y YouTube) y **9:16** (Reels, TikTok y Shorts).
Dura unos 43 segundos y **no lleva audio**: la música se añade en el editor de cada red, con
licencia de esa plataforma.

## Comandos

```bash
npm install
npm run capturas     # captura la web publicada (escritorio 2× y móvil 3×) con Playwright + Edge
npm run studio       # vista previa interactiva en el navegador
npm run render       # out/votoclaro-promo-16x9.mp4 y out/votoclaro-promo-9x16.mp4
node render.mjs https://tudominio.es   # con otra URL en el cierre
```

- Haz las capturas de nuevo cuando lleguen los programas del 29N, porque el cierre menciona los
  de 2023.
- Las capturas usan la URL `VC_URL`, que por defecto es la de producción.
- Cada ejecución hace una pregunta real al chat por formato, y así gasta 2 de las preguntas
  gratis. El tope es de 6 al día por IP.

## Cómo está hecho

- Las capturas son reales: `capturas.mjs` guarda los PNG y la posición de los elementos
  (`src/posiciones.json`). Así el cursor, el zoom y los brillos apuntan a sitios reales.
- En móvil, la comparativa es un carrusel. Se captura una vez por tarjeta y el vídeo las pasa
  deslizando.
- El chat se captura a página entera, sin la cabecera ni el formulario. El vídeo desplaza la
  conversación por debajo de los dos, que quedan fijos, como en el teléfono. Así se lee la
  respuesta de todos los partidos.
- **Movimiento**: sigue la skill `motion-design` (LottieFiles), con estas decisiones:
  - personalidad *Premium*, sin rebotes;
  - una curva firma `(0.2, 0, 0, 1)`;
  - tres duraciones (300, 500 y 800 ms);
  - una sola entrada: sube 24 px y aparece;
  - tres capas: pantalla, rotulador/cursor y fondo;
  - ningún movimiento recorre más de un tercio de pantalla sin un fotograma clave intermedio.
- **Diseño**: tokens de la skill `editorial-design`: papel, tinta y el rotulador amarillo como
  marca de «aquí está la fuente».
- **Neutralidad**:
  - la comparativa y el chat muestran PP, PSOE, Sumar y VOX, las cuatro fuerzas estatales con
    grupo parlamentario propio, en el orden alfabético de la web;
  - en la fila de selección se ven todos los partidos;
  - la cita que se abre es la del primero de la lista (PP);
  - la pregunta del chat es una que responden los cuatro, y todas sus citas se iluminan igual.
- **Licencia de Remotion**: gratuita para particulares y empresas de hasta 3 personas.
