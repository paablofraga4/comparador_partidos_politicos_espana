/**
 * Las 7 escenas del vídeo, para los dos formatos. Cada escena cuenta una micro-historia
 * (preparación → acción → reacción → reposo) y presenta un solo elemento protagonista.
 * Neutralidad: siempre todos los partidos en el orden alfabético de la web; la cita que se
 * abre es la del primero (BNG), sin destacar a nadie más.
 */
import type { ReactNode } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

import {
  camara,
  clic,
  Cursor,
  entrada,
  Fondo,
  latido,
  Marco,
  Pantalla,
  progreso,
  recorrido,
  RectCaptura,
  Rotulador,
  Rotulo,
  type Capa,
  type Rect,
  type Toma,
} from "./componentes";
import { C, D, GEO, SANS, SERIF, type Formato } from "./tema";

type Punto = { x: number; y: number };

/** Puntos de interés de cada captura (px CSS), medidos sobre las capturas reales. */
const P: Record<
  Formato,
  {
    compara: Toma[];
    cita: Punto;
    cursorCita: Punto;
    fuente: Toma[];
    resaltado: Rect;
    interruptor: Punto;
    cursorInterruptor: Punto;
    facil: Toma[];
    burbuja: Rect;
    respuesta: Rect;
    citaChat: Rect;
    chat: Toma[];
  }
> = {
  horizontal: {
    compara: [
      { f: 0, zoom: 1, x: 720, y: 420 },
      { f: 40, zoom: 1, x: 720, y: 420 },
      { f: 205, zoom: 1.18, x: 720, y: 700 },
    ],
    cita: { x: 351, y: 720 },
    cursorCita: { x: 610, y: 840 },
    fuente: [
      { f: 0, zoom: 1.18, x: 720, y: 700 },
      { f: 40, zoom: 1.6, x: 390, y: 700 },
      { f: 82, zoom: 1.6, x: 390, y: 700 },
      { f: 110, zoom: 1, x: 720, y: 450 },
      { f: 135, zoom: 1, x: 720, y: 450 },
      { f: 165, zoom: 1.25, x: 1000, y: 400 },
      { f: 195, zoom: 1.6, x: 1237, y: 345 },
    ],
    resaltado: { x: 1098, y: 309, w: 278, h: 58 },
    interruptor: { x: 1151, y: 32 },
    cursorInterruptor: { x: 960, y: 230 },
    facil: [
      { f: 0, zoom: 1, x: 720, y: 300 },
      { f: 72, zoom: 1, x: 720, y: 300 },
      { f: 98, zoom: 1.05, x: 720, y: 540 },
      { f: 128, zoom: 1.12, x: 720, y: 780 },
    ],
    burbuja: { x: 750, y: 499, w: 336, h: 54 },
    respuesta: { x: 362, y: 572, w: 716, h: 218 },
    citaChat: { x: 534, y: 610, w: 78, h: 26 },
    // Arranca bajo el titular de la página (no lo corta) y acaba en la primera cita
    chat: [
      { f: 0, zoom: 1, x: 720, y: 552 },
      { f: 150, zoom: 1, x: 720, y: 552 },
      { f: 200, zoom: 1.45, x: 660, y: 640 },
    ],
  },
  vertical: {
    compara: [
      { f: 0, zoom: 1, x: 195, y: 420 },
      { f: 40, zoom: 1, x: 195, y: 420 },
      { f: 205, zoom: 1.1, x: 195, y: 560 },
    ],
    cita: { x: 135, y: 675 },
    cursorCita: { x: 300, y: 770 },
    fuente: [
      { f: 0, zoom: 1.1, x: 195, y: 560 },
      { f: 40, zoom: 1.45, x: 170, y: 640 },
      { f: 82, zoom: 1.45, x: 170, y: 640 },
      { f: 110, zoom: 1, x: 195, y: 422 },
      { f: 135, zoom: 1, x: 195, y: 422 },
      { f: 180, zoom: 1.45, x: 237, y: 316 },
    ],
    resaltado: { x: 136, y: 292, w: 202, h: 44 },
    interruptor: { x: 247, y: 32 },
    cursorInterruptor: { x: 150, y: 230 },
    facil: [
      { f: 0, zoom: 1, x: 195, y: 320 },
      { f: 72, zoom: 1, x: 195, y: 320 },
      { f: 128, zoom: 1.05, x: 195, y: 600 },
    ],
    burbuja: { x: 46, y: 222, w: 333, h: 54 },
    respuesta: { x: 17, y: 294, w: 357, h: 432 },
    citaChat: { x: 48, y: 386, w: 78, h: 28 },
    chat: [
      { f: 0, zoom: 1, x: 195, y: 422 },
      { f: 150, zoom: 1, x: 195, y: 422 },
      { f: 200, zoom: 1.18, x: 195, y: 400 },
    ],
  },
};

const captura = (formato: Formato, nombre: string) => `capturas/${GEO[formato].captura.prefijo}-${nombre}.png`;

/** Pantalla dentro de su marco, que entra una vez (sube + opacidad) y su sombra llega después. */
function Escena({
  formato,
  rotulo,
  capas,
  tomas,
  encima,
  entrar = true,
}: {
  formato: Formato;
  rotulo: ReactNode;
  capas: Capa[];
  tomas: Toma[];
  encima?: (mapa: (x: number, y: number) => Punto, k: number, f: number) => ReactNode;
  entrar?: boolean;
}) {
  const f = useCurrentFrame();
  const g = GEO[formato];
  const p = entrar ? progreso(f, 0, D.lenta) : 1;
  return (
    <AbsoluteFill>
      <Fondo />
      {rotulo}
      <Marco
        formato={formato}
        style={{ opacity: p, transform: `translateY(${(1 - p) * 40}px)` }}
      >
        <Pantalla
          capas={capas}
          vw={g.captura.vw}
          vh={g.captura.vh}
          ancho={g.pantalla.ancho}
          alto={g.pantalla.alto}
          vista={camara(f, tomas)}
          encima={encima ? (m, k) => encima(m, k, f) : undefined}
        />
      </Marco>
    </AbsoluteFill>
  );
}

// --- 1 · Gancho ---------------------------------------------------------------------------------
export function Gancho({ formato }: { formato: Formato }) {
  const f = useCurrentFrame();
  const v = formato === "vertical";
  return (
    <AbsoluteFill>
      <Fondo />
      <div
        style={{
          position: "absolute",
          left: GEO[formato].margen,
          right: GEO[formato].margen,
          top: v ? 640 : 300,
        }}
      >
        <p style={{ margin: 0, fontFamily: SANS, fontWeight: 600, fontSize: v ? 46 : 40, color: C.tenue, ...entrada(f, 6) }}>
          Elecciones generales · 29 de noviembre
        </p>
        <h1
          style={{
            margin: "28px 0 0",
            fontFamily: SERIF,
            fontWeight: 500,
            fontSize: v ? 132 : 150,
            lineHeight: 1.04,
            letterSpacing: "-0.02em",
            color: C.tinta,
            ...entrada(f, 12, D.lenta),
          }}
        >
          ¿Qué propone{v ? <br /> : " "}
          <Rotulador inicio={34}>cada partido</Rotulador>?
        </h1>
      </div>
    </AbsoluteFill>
  );
}

// --- 2 · Compara ----------------------------------------------------------------------------------
export function Compara({ formato }: { formato: Formato }) {
  return (
    <Escena
      formato={formato}
      rotulo={
        <Rotulo
          formato={formato}
          inicio={6}
          titulo={
            <>
              Compara qué propone <Rotulador inicio={26}>cada partido</Rotulador>.
            </>
          }
          sub="Elige partidos y temas: sus propuestas, una al lado de otra."
        />
      }
      capas={[{ src: captura(formato, "comparar") }]}
      tomas={P[formato].compara}
    />
  );
}

// --- 3 · Fuente ----------------------------------------------------------------------------------
export function Fuente({ formato }: { formato: Formato }) {
  const f = useCurrentFrame();
  const p = P[formato];
  const cambio = progreso(f, 80, D.normal);
  return (
    <Escena
      formato={formato}
      entrar={false}
      rotulo={
        <Rotulo
          formato={formato}
          titulo={
            <>
              Cada frase, con <Rotulador inicio={18}>su fuente</Rotulador>.
            </>
          }
          sub="Pulsa la página y verás el programa original, con el texto resaltado."
        />
      }
      capas={[
        { src: captura(formato, "comparar"), opacidad: 1 - cambio },
        { src: captura(formato, "fuente"), opacidad: cambio },
      ]}
      tomas={p.fuente}
      encima={(mapa, k, fr) => {
        const c = recorrido(fr, p.cursorCita, p.cita, 24, 32);
        const pos = mapa(c.x, c.y);
        const visible = progreso(fr, 18, D.rapida) * (1 - progreso(fr, 78, D.rapida));
        const { pulsado, onda } = clic(fr, 62);
        const brillo = latido(fr, 196);
        return (
          <>
            <RectCaptura
              r={p.resaltado}
              mapa={mapa}
              k={k}
              style={{
                borderRadius: 10,
                outline: `4px solid ${C.rotulador}`,
                boxShadow: `0 0 0 10px rgba(255,228,92,0.35), 0 0 40px rgba(255,228,92,0.6)`,
                opacity: brillo,
              }}
            />
            {visible > 0 && <Cursor x={pos.x} y={pos.y} opacidad={visible} pulsado={pulsado} onda={onda} />}
          </>
        );
      }}
    />
  );
}

// --- 4 · Lectura fácil ----------------------------------------------------------------------------
export function Facil({ formato }: { formato: Formato }) {
  const f = useCurrentFrame();
  const p = P[formato];
  const cambio = progreso(f, 46, D.rapida);
  return (
    <Escena
      formato={formato}
      rotulo={
        <Rotulo
          formato={formato}
          inicio={6}
          titulo={
            <>
              <Rotulador inicio={26}>Lectura fácil</Rotulador>, a un toque.
            </>
          }
          sub="Frases cortas y palabras sencillas, para que nadie se quede fuera."
        />
      }
      capas={[
        { src: captura(formato, "comparar"), opacidad: 1 - cambio },
        { src: captura(formato, "facil"), opacidad: cambio },
      ]}
      tomas={p.facil}
      encima={(mapa, _k, fr) => {
        const c = recorrido(fr, p.cursorInterruptor, p.interruptor, 16, 26);
        const pos = mapa(c.x, c.y);
        const visible = progreso(fr, 10, D.rapida) * (1 - progreso(fr, 62, D.rapida));
        const { pulsado, onda } = clic(fr, 44);
        return visible > 0 ? (
          <Cursor x={pos.x} y={pos.y} opacidad={visible} pulsado={pulsado} onda={onda} />
        ) : null;
      }}
    />
  );
}

// --- 5 · Pregunta ---------------------------------------------------------------------------------
export function Pregunta({ formato }: { formato: Formato }) {
  const f = useCurrentFrame();
  const p = P[formato];
  const src = captura(formato, "chat");
  const burbuja = progreso(f, 16, D.normal);
  // La respuesta «se escribe»: la tapa blanca se retira de arriba abajo
  const escrita = progreso(f, 44, 100);
  const r = p.respuesta;
  return (
    <Escena
      formato={formato}
      rotulo={
        <Rotulo
          formato={formato}
          inicio={6}
          titulo={
            <>
              <Rotulador inicio={26}>Pregunta</Rotulador> lo que quieras.
            </>
          }
          sub="Responde solo con los programas, cita cada frase y nunca te dice a quién votar."
        />
      }
      capas={[
        { src },
        { color: C.papel, recorte: p.burbuja },
        { color: C.blanco, recorte: { x: r.x, y: r.y + r.h * escrita, w: r.w, h: r.h * (1 - escrita) } },
        { src, recorte: p.burbuja, opacidad: burbuja, dy: (1 - burbuja) * 18 },
      ]}
      tomas={p.chat}
      encima={(mapa, k, fr) => (
        <RectCaptura
          r={p.citaChat}
          mapa={mapa}
          k={k}
          style={{
            borderRadius: 8,
            outline: `3px solid ${C.rotulador}`,
            boxShadow: `0 0 0 8px rgba(255,228,92,0.35), 0 0 30px rgba(255,228,92,0.6)`,
            opacity: latido(fr, 206),
          }}
        />
      )}
    />
  );
}

// --- 6 · Principios --------------------------------------------------------------------------------
export function Principios({ formato }: { formato: Formato }) {
  const f = useCurrentFrame();
  const v = formato === "vertical";
  const lineas: ReactNode[] = [
    <>
      Sin <Rotulador inicio={24}>opiniones</Rotulador>.
    </>,
    <>
      Sin <Rotulador inicio={30}>anuncios</Rotulador>.
    </>,
    <>
      Todos los partidos,{v ? <br /> : " "}en <Rotulador inicio={36}>orden alfabético</Rotulador>.
    </>,
  ];
  return (
    <AbsoluteFill>
      <Fondo />
      <div style={{ position: "absolute", left: GEO[formato].margen, right: GEO[formato].margen, top: v ? 640 : 250 }}>
        {lineas.map((l, i) => (
          <p
            key={i}
            style={{
              margin: "0 0 18px",
              fontFamily: SERIF,
              fontWeight: 500,
              fontSize: v ? 104 : 96,
              lineHeight: 1.1,
              color: C.tinta,
              ...entrada(f, 4 + i * 5),
            }}
          >
            {l}
          </p>
        ))}
        <p style={{ margin: "34px 0 0", fontFamily: SANS, fontSize: v ? 40 : 36, color: C.tenue, ...entrada(f, 44) }}>
          Cada dato enlaza a la página exacta del programa oficial.
        </p>
      </div>
    </AbsoluteFill>
  );
}

// --- 7 · Cierre ------------------------------------------------------------------------------------
export function Cierre({ formato, url }: { formato: Formato; url: string }) {
  const f = useCurrentFrame();
  const v = formato === "vertical";
  return (
    <AbsoluteFill>
      <Fondo />
      <div style={{ position: "absolute", left: GEO[formato].margen, right: GEO[formato].margen, top: v ? 620 : 250 }}>
        <h1
          style={{
            margin: 0,
            fontFamily: SERIF,
            fontWeight: 600,
            fontSize: v ? 170 : 180,
            letterSpacing: "-0.02em",
            color: C.tinta,
            ...entrada(f, 4, D.lenta),
          }}
        >
          Voto<Rotulador inicio={18}>Claro</Rotulador>
        </h1>
        <p style={{ margin: "26px 0 0", fontFamily: SANS, fontSize: v ? 46 : 44, color: C.tinta, ...entrada(f, 10) }}>
          Compara los programas del 29N, con la fuente a un clic.
        </p>
        <p
          style={{
            margin: "34px 0 0",
            fontFamily: SANS,
            fontWeight: 600,
            fontSize: v ? 30 : 34,
            color: C.tinta,
            wordBreak: "break-all",
            ...entrada(f, 16),
          }}
        >
          {url}
        </p>
        <p
          style={{
            margin: v ? "120px 0 0" : "80px 0 0",
            maxWidth: 1200,
            fontFamily: SANS,
            fontSize: v ? 30 : 26,
            lineHeight: 1.45,
            color: C.tenue,
            ...entrada(f, 28),
          }}
        >
          Proyecto independiente, sin relación con ningún partido. Hasta que se publiquen los
          programas del 29N, verás los de 2023, avisado.
        </p>
      </div>
    </AbsoluteFill>
  );
}
