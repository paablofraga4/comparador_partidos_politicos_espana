/**
 * Identidad visual y de movimiento del vídeo.
 * - Diseño: tokens de la skill «editorial-design» (papel, tinta, rotulador amarillo).
 * - Movimiento (skill «motion-design»): personalidad Premium, tranquila, sin rebotes.
 *   Una curva firma para el 80 % del movimiento, tres duraciones y una sola entrada (sube 24 px
 *   + opacidad). Tres capas: principal (pantalla/titular), secundaria (rotulador, cursor,
 *   sombras) y ambiental (deriva lenta del fondo).
 */
import { loadFont as cargarNewsreader } from "@remotion/google-fonts/Newsreader";
import { loadFont as cargarPublicSans } from "@remotion/google-fonts/PublicSans";
import { Easing } from "remotion";

export const SERIF = cargarNewsreader("normal", {
  weights: ["500", "600"],
  subsets: ["latin", "latin-ext"],
}).fontFamily;
export const SANS = cargarPublicSans("normal", {
  weights: ["400", "500", "600", "700"],
  subsets: ["latin", "latin-ext"],
}).fontFamily;

export const C = {
  papel: "#FAF8F3",
  blanco: "#FFFFFF",
  tinta: "#16181D",
  tenue: "#5B6170",
  linea: "#E4E0D6",
  rotulador: "#FFE45C",
};

export const FPS = 30;

/** Curva firma: entradas y movimientos en pantalla (decelera). */
export const EASE = Easing.bezier(0.2, 0, 0, 1);
/** Salidas (acelera). */
export const EASE_SALIDA = Easing.bezier(0.3, 0, 1, 1);
/** Cámara: suave en los dos extremos («elegancia»). */
export const EASE_CAMARA = Easing.bezier(0.4, 0, 0.2, 1);

/** Paleta de duraciones en fotogramas: 300 / 500 / 800 ms. */
export const D = { rapida: 9, normal: 15, lenta: 24 };

export type Formato = "horizontal" | "vertical";

/** Geometría de cada formato (px del vídeo). */
export const GEO = {
  horizontal: {
    ancho: 1920,
    alto: 1080,
    margen: 120,
    rotulo: { top: 70, tam: 64, sub: 30, ancho: 1680 },
    pantalla: { left: 120, top: 272, ancho: 1680, alto: 720 },
    captura: { prefijo: "escritorio", vw: 1440, vh: 900 },
  },
  vertical: {
    ancho: 1080,
    alto: 1920,
    margen: 80,
    rotulo: { top: 110, tam: 76, sub: 36, ancho: 920 },
    pantalla: { left: 164, top: 470, ancho: 752, alto: 1340 },
    captura: { prefijo: "movil", vw: 390, vh: 844 },
  },
} as const;
