import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";

import { C, D, EASE, EASE_CAMARA, GEO, SANS, SERIF, type Formato } from "./tema";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** 0→1 entre dos fotogramas con la curva firma. */
export const progreso = (f: number, inicio: number, dur: number, easing = EASE) =>
  interpolate(f, [inicio, inicio + dur], [0, 1], { ...clamp, easing });

/** Entrada única de toda la pieza: sube 24 px + opacidad (nunca solo opacidad). */
export function entrada(f: number, inicio: number, dur = D.normal): CSSProperties {
  const p = progreso(f, inicio, dur);
  return { opacity: p, transform: `translateY(${(1 - p) * 24}px)` };
}

/** Capa ambiental: luz de rotulador que deriva muy despacio sobre el papel. */
export function Fondo() {
  const f = useCurrentFrame();
  const x = 62 + Math.sin(f / 95) * 14;
  const y = 38 + Math.cos(f / 120) * 12;
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at ${x}% ${y}%, rgba(255,228,92,0.16), transparent 52%), ${C.papel}`,
      }}
    />
  );
}

/** Subrayado de rotulador que se traza de izquierda a derecha (capa secundaria). */
export function Rotulador({ inicio, children }: { inicio: number; children: ReactNode }) {
  const f = useCurrentFrame();
  const p = progreso(f, inicio, D.lenta);
  return (
    <span
      style={{
        backgroundImage: `linear-gradient(${C.rotulador}, ${C.rotulador})`,
        backgroundRepeat: "no-repeat",
        backgroundSize: `${p * 100}% 0.32em`,
        backgroundPosition: "0 86%",
        paddingInline: "0.04em",
      }}
    >
      {children}
    </span>
  );
}

/** Rótulo de escena: titular serif + subtítulo, con escalonado de 4 fotogramas. */
export function Rotulo({
  formato,
  titulo,
  sub,
  inicio = 0,
}: {
  formato: Formato;
  titulo: ReactNode;
  sub?: ReactNode;
  inicio?: number;
}) {
  const f = useCurrentFrame();
  const g = GEO[formato];
  return (
    <div style={{ position: "absolute", left: g.margen, top: g.rotulo.top, width: g.rotulo.ancho }}>
      <h1
        style={{
          margin: 0,
          fontFamily: SERIF,
          fontWeight: 500,
          fontSize: g.rotulo.tam,
          lineHeight: 1.1,
          color: C.tinta,
          letterSpacing: "-0.01em",
          ...entrada(f, inicio),
        }}
      >
        {titulo}
      </h1>
      {sub && (
        <p
          style={{
            margin: "18px 0 0",
            fontFamily: SANS,
            fontSize: g.rotulo.sub,
            lineHeight: 1.4,
            color: C.tenue,
            ...entrada(f, inicio + 4),
          }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

// --- Cámara sobre una captura ------------------------------------------------------------------

export type Toma = { f: number; zoom: number; x: number; y: number };
export type Vista = { zoom: number; x: number; y: number };

/** Interpola la cámara entre tomas (cada tramo con la curva de cámara). */
export function camara(f: number, tomas: Toma[]): Vista {
  if (f <= tomas[0].f) return tomas[0];
  for (let i = 0; i < tomas.length - 1; i++) {
    const a = tomas[i];
    const b = tomas[i + 1];
    if (f <= b.f) {
      const p = progreso(f, a.f, b.f - a.f, EASE_CAMARA);
      return {
        zoom: a.zoom + (b.zoom - a.zoom) * p,
        x: a.x + (b.x - a.x) * p,
        y: a.y + (b.y - a.y) * p,
      };
    }
  }
  return tomas[tomas.length - 1];
}

export type Rect = { x: number; y: number; w: number; h: number };
export type Capa = {
  /** Imagen de la captura, o `color` para tapar una zona (p. ej. antes de «escribirla») */
  src?: string;
  color?: string;
  opacidad?: number;
  /** Recorte en px CSS de la captura (para animar solo una parte) */
  recorte?: Rect;
  dy?: number;
};
type Mapa = (x: number, y: number) => { x: number; y: number };

/**
 * Captura con cámara: la vista centra (x, y) —en px CSS de la captura— con el zoom pedido, sin
 * salirse de la imagen. `encima` recibe el mapa captura→vídeo para cursor, brillos, etc.
 */
export function Pantalla({
  capas,
  vw,
  vh,
  ancho,
  alto,
  vista,
  encima,
}: {
  capas: Capa[];
  vw: number;
  vh: number;
  ancho: number;
  alto: number;
  vista: Vista;
  encima?: (mapa: Mapa, k: number) => ReactNode;
}) {
  const k = (ancho / vw) * vista.zoom;
  const tx = Math.min(0, Math.max(ancho - vw * k, ancho / 2 - vista.x * k));
  const ty = Math.min(0, Math.max(alto - vh * k, alto / 2 - vista.y * k));
  const mapa: Mapa = (x, y) => ({ x: tx + x * k, y: ty + y * k });
  return (
    <div style={{ position: "relative", width: ancho, height: alto, overflow: "hidden", background: C.papel }}>
      {capas.map((c, i) => {
        const style: CSSProperties = {
          position: "absolute",
          left: 0,
          top: 0,
          width: vw,
          height: vh,
          transformOrigin: "0 0",
          transform: `translate(${tx}px, ${ty + (c.dy ?? 0)}px) scale(${k})`,
          opacity: c.opacidad ?? 1,
          clipPath: c.recorte
            ? `inset(${c.recorte.y}px ${vw - c.recorte.x - c.recorte.w}px ${vh - c.recorte.y - c.recorte.h}px ${c.recorte.x}px)`
            : undefined,
        };
        return c.src ? (
          <Img key={i} src={staticFile(c.src)} style={style} />
        ) : (
          <div key={i} style={{ ...style, background: c.color }} />
        );
      })}
      {encima?.(mapa, k)}
    </div>
  );
}

/** Rectángulo en coordenadas de la captura (tapas, brillos). */
export function RectCaptura({ r, mapa, k, style }: { r: Rect; mapa: Mapa; k: number; style: CSSProperties }) {
  const p = mapa(r.x, r.y);
  return (
    <div style={{ position: "absolute", left: p.x, top: p.y, width: r.w * k, height: r.h * k, ...style }} />
  );
}

/** Marco de navegador (escritorio) o de teléfono (vertical). */
export function Marco({
  formato,
  children,
  style,
}: {
  formato: Formato;
  children: ReactNode;
  style?: CSSProperties;
}) {
  const p = GEO[formato].pantalla;
  if (formato === "vertical") {
    return (
      <div
        style={{
          position: "absolute",
          left: p.left - 14,
          top: p.top - 14,
          padding: 14,
          borderRadius: 64,
          background: C.tinta,
          boxShadow: "0 40px 90px rgba(22,24,29,0.22), 0 8px 24px rgba(22,24,29,0.12)",
          ...style,
        }}
      >
        <div style={{ borderRadius: 50, overflow: "hidden" }}>{children}</div>
      </div>
    );
  }
  return (
    <div
      style={{
        position: "absolute",
        left: p.left,
        top: p.top - 46,
        borderRadius: 18,
        overflow: "hidden",
        background: C.blanco,
        border: `1px solid ${C.linea}`,
        boxShadow: "0 34px 90px rgba(22,24,29,0.16), 0 6px 18px rgba(22,24,29,0.08)",
        ...style,
      }}
    >
      <div
        style={{
          height: 46,
          display: "flex",
          alignItems: "center",
          gap: 9,
          padding: "0 18px",
          background: "#F3F1EB",
          borderBottom: `1px solid ${C.linea}`,
        }}
      >
        {["#E4E0D6", "#E4E0D6", "#E4E0D6"].map((c, i) => (
          <span key={i} style={{ width: 12, height: 12, borderRadius: 6, background: c }} />
        ))}
        <span
          style={{
            marginLeft: 14,
            padding: "4px 14px",
            borderRadius: 8,
            background: C.papel,
            border: `1px solid ${C.linea}`,
            fontFamily: SANS,
            fontSize: 15,
            color: C.tenue,
          }}
        >
          VotoClaro
        </span>
      </div>
      {children}
    </div>
  );
}

/** Cursor con pulsación (anticipación: encoge; acción: vuelve) y onda de clic. */
export function Cursor({
  x,
  y,
  opacidad,
  pulsado,
  onda,
}: {
  x: number;
  y: number;
  opacidad: number;
  pulsado: number;
  onda: number;
}) {
  return (
    <>
      {onda > 0 && onda < 1 && (
        <div
          style={{
            position: "absolute",
            left: x - 10 - onda * 46,
            top: y - 10 - onda * 46,
            width: 20 + onda * 92,
            height: 20 + onda * 92,
            borderRadius: "50%",
            border: `3px solid ${C.tinta}`,
            background: "rgba(255,228,92,0.45)",
            opacity: (1 - onda) * 0.8,
          }}
        />
      )}
      <svg
        width={38}
        height={38}
        viewBox="0 0 24 24"
        style={{
          position: "absolute",
          left: x - 6,
          top: y - 3,
          opacity: opacidad,
          transform: `scale(${1 - pulsado * 0.14})`,
          transformOrigin: "6px 3px",
          filter: "drop-shadow(0 4px 8px rgba(22,24,29,0.3))",
        }}
      >
        <path d="M5 3l14 8.2-6.4 1.5L9.7 19z" fill={C.tinta} stroke="#fff" strokeWidth={1.6} strokeLinejoin="round" />
      </svg>
    </>
  );
}

/** Recorrido del cursor en arco (camino curvo = amable) entre dos puntos de la captura. */
export function recorrido(
  f: number,
  desde: { x: number; y: number },
  hasta: { x: number; y: number },
  inicio: number,
  dur: number,
) {
  const p = progreso(f, inicio, dur);
  const curva = Math.sin(p * Math.PI) * 40;
  return { x: desde.x + (hasta.x - desde.x) * p - curva * 0.4, y: desde.y + (hasta.y - desde.y) * p - curva };
}

/** Pulsación: 0→1→0 en 6 fotogramas; onda de 0 a 1 en 18. */
export function clic(f: number, en: number) {
  const pulsado = f < en ? 0 : f < en + 3 ? (f - en) / 3 : f < en + 6 ? 1 - (f - en - 3) / 3 : 0;
  const onda = f < en ? 0 : (f - en) / 18;
  return { pulsado, onda };
}

/** Brillo que late (capa ambiental) alrededor de un fragmento: seno, sin parpadeos. */
export function latido(f: number, inicio: number) {
  if (f < inicio) return 0;
  const entradaP = progreso(f, inicio, D.normal);
  return entradaP * (0.55 + 0.45 * (0.5 - 0.5 * Math.cos(((f - inicio) / 45) * 2 * Math.PI)));
}
