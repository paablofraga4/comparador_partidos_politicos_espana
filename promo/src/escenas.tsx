/**
 * Las 7 escenas del vídeo, para los dos formatos. Cada escena cuenta una micro-historia
 * (preparación → acción → reacción → reposo) y presenta un solo elemento protagonista.
 * Neutralidad: PP, PSOE, Sumar y VOX (las cuatro fuerzas estatales con grupo propio) en el orden
 * alfabético de la web, con el mismo trato; la cita que se abre es la del primero (PP) y en el
 * chat se iluminan todas las citas a medida que aparecen.
 */
import type { ReactNode } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

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
import posiciones from "./posiciones.json";
import { C, D, GEO, SANS, SERIF, type Formato } from "./tema";

type Punto = { x: number; y: number };

/** Posiciones medidas por capturas.mjs sobre las capturas reales (px CSS). */
const POS: Record<Formato, typeof posiciones.escritorio> = {
  horizontal: posiciones.escritorio,
  vertical: posiciones.movil,
};

const centro = (r: Rect): Punto => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
const mas = (p: Punto, dx: number, dy: number): Punto => ({ x: p.x + dx, y: p.y + dy });

/** Escala de la captura con zoom 1 y alto de la captura que cabe en pantalla (px CSS). */
function encuadre(formato: Formato) {
  const g = GEO[formato];
  const k = g.pantalla.ancho / g.captura.vw;
  return { k, visible: g.pantalla.alto / k, vw: g.captura.vw, vh: g.captura.vh };
}

/** Tomas de cámara y puntos del cursor, derivados de las posiciones medidas. */
function plan(formato: Formato) {
  const v = formato === "vertical";
  const m = POS[formato];
  const { visible, vw } = encuadre(formato);
  const arriba = { zoom: 1, x: vw / 2, y: visible / 2 };
  const cita = centro(m.cita);
  const resaltado = centro(m.resaltado);
  const interruptor = centro(m.interruptor);
  // Escritorio: la comparativa se acerca a la cita · Móvil: se queda quieta mientras se desliza
  const finCompara: Omit<Toma, "f"> = v ? arriba : { zoom: 1.1, ...cita };
  const cerca = v ? 1.45 : 1.6;
  return {
    compara: [{ f: 0, ...arriba }, { f: 40, ...arriba }, { f: 205, ...finCompara }] as Toma[],
    cita,
    cursorCita: mas(cita, v ? 150 : 260, v ? 110 : 140),
    fuente: [
      { f: 0, ...finCompara },
      { f: 40, zoom: cerca, ...cita },
      { f: 82, zoom: cerca, ...cita },
      { f: 110, ...arriba },
      { f: 135, ...arriba },
      ...(v ? [] : [{ f: 165, zoom: 1.25, x: (arriba.x + resaltado.x) / 2, y: (arriba.y + resaltado.y) / 2 }]),
      { f: v ? 180 : 195, zoom: cerca, ...resaltado },
    ] as Toma[],
    interruptor,
    cursorInterruptor: mas(interruptor, v ? -90 : -190, 200),
    // La lectura fácil alarga las tarjetas: la cámara baja hasta verlas enteras
    facil: [
      { f: 0, ...arriba },
      { f: 72, ...arriba },
      { f: 128, zoom: 1, x: vw / 2, y: m.tarjeta.y - (v ? 20 : 30) + visible / 2 },
    ] as Toma[],
  };
}

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
/** Fotogramas en que empieza cada arrastre del carrusel móvil (uno por tarjeta siguiente). */
const DESLIZA = [56, 102, 148];

export function Compara({ formato }: { formato: Formato }) {
  const f = useCurrentFrame();
  const m = POS[formato];
  const t = m.tarjeta;
  // Móvil: una captura por tarjeta; la nueva entra deslizándose sobre la zona del carrusel
  const zona = { x: 0, y: t.y - 6, w: GEO[formato].captura.vw, h: GEO[formato].captura.vh - t.y + 6 };
  const a = { x: t.x + t.w * 0.8, y: t.y + t.h * 0.5 };
  const b = { x: t.x + t.w * 0.2, y: a.y };
  const tramos = DESLIZA.slice(0, m.tarjetas - 1).flatMap((ini, i, arr) => [
    { ini, de: a, a: b, pulsado: true },
    ...(i < arr.length - 1 ? [{ ini: ini + 19, de: b, a, pulsado: false }] : []),
  ]);
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
      capas={[
        { src: captura(formato, "comparar") },
        ...DESLIZA.slice(0, m.tarjetas - 1).map((ini, i): Capa => {
          const p = progreso(f, ini + 2, D.normal);
          return { src: captura(formato, `comparar-${i + 2}`), recorte: zona, opacidad: p, dx: (1 - p) * 40 };
        }),
      ]}
      tomas={plan(formato).compara}
      encima={
        tramos.length
          ? (mapa, _k, fr) => {
              let punto = a;
              let pulsado = 0;
              for (const tr of tramos) {
                if (fr < tr.ini) break;
                const p = progreso(fr, tr.ini, D.normal);
                punto = { x: tr.de.x + (tr.a.x - tr.de.x) * p, y: tr.de.y };
                pulsado = tr.pulsado ? Math.max(0, Math.min(1, (fr - tr.ini) / 3, (tr.ini + D.normal - fr) / 3)) : 0;
              }
              const visible = progreso(fr, 40, D.rapida) * (1 - progreso(fr, 172, D.rapida));
              const pos = mapa(punto.x, punto.y);
              return visible > 0 ? <Cursor x={pos.x} y={pos.y} opacidad={visible} pulsado={pulsado} onda={0} /> : null;
            }
          : undefined
      }
    />
  );
}

// --- 3 · Fuente ----------------------------------------------------------------------------------
export function Fuente({ formato }: { formato: Formato }) {
  const f = useCurrentFrame();
  const p = plan(formato);
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
              r={POS[formato].resaltado}
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
  const p = plan(formato);
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
/** La respuesta «se escribe» a ritmo constante, como el texto que llega del chat. */
const ESCRIBE = { inicio: 44, dur: 150 };

export function Pregunta({ formato }: { formato: Formato }) {
  const f = useCurrentFrame();
  const ch = POS[formato].chat;
  const { k, visible, vw } = encuadre(formato);
  const r = ch.respuesta;
  const burbuja = progreso(f, 16, D.normal);
  const escrita = interpolate(f, [ESCRIBE.inicio, ESCRIBE.inicio + ESCRIBE.dur], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const borde = r.y + r.h * escrita;
  // Desplazamiento de la página: la conversación sube por debajo de la cabecera y del formulario
  // (pegado abajo, como en la web) siguiendo el texto que se escribe, hasta ver la respuesta entera
  const pegado = visible - 12 - ch.formulario.h;
  const s0 = Math.max(0, ch.burbuja.y + ch.burbuja.h + 24 - pegado);
  const sMax = r.y + r.h + 16 - pegado;
  const sMin = ch.burbuja.y - ch.cabecera - 8;
  const s1 = Math.max(s0, sMin >= sMax - 16 ? (sMin + sMax) / 2 : sMax);
  const s = Math.min(s1, Math.max(s0, borde + 16 - pegado));
  const yFormulario = Math.min(ch.formularioNatural - s, pegado);
  const pagina = captura(formato, "chat-pagina");
  const vista = captura(formato, "chat");
  const fo = ch.formulario;
  const subeFormulario = fo.y - yFormulario;
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
        { src: pagina, alto: ch.alto, scroll: s },
        { color: C.papel, recorte: ch.burbuja, alto: ch.alto, scroll: s },
        { color: C.papel, recorte: { x: r.x - 2, y: borde - 1, w: r.w + 4, h: r.y + r.h + 3 - borde }, alto: ch.alto, scroll: s },
        { src: pagina, alto: ch.alto, scroll: s, recorte: ch.burbuja, opacidad: burbuja, dy: (1 - burbuja) * 18 },
        // Cabecera y formulario fijos. La cabecera sale del inicio (nada detrás de su desenfoque) y
        // el formulario se recorta 2 px por dentro (en la captura roza el texto de detrás): debajo
        // va su fondo blanco y encima se redibujan su borde y su sombra
        { src: captura(formato, "inicio"), recorte: { x: 0, y: 0, w: vw, h: ch.cabecera } },
        { color: C.blanco, recorte: fo, radio: 16, scroll: subeFormulario },
        { src: vista, recorte: { ...fo, y: fo.y + 2, h: fo.h - 2 }, radio: 16, scroll: subeFormulario },
      ]}
      tomas={[{ f: 0, zoom: 1, x: vw / 2, y: 0 }]}
      encima={(_mapa, _k, fr) => (
        <>
          {/* Cada cita se ilumina al aparecer; el brillo se recorta entre la cabecera y el formulario */}
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: ch.cabecera * k,
              height: (yFormulario - ch.cabecera) * k,
              overflow: "hidden",
            }}
          >
            {ch.citas.map((c, i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: c.x * k,
                  top: (c.y - s - ch.cabecera) * k,
                  width: c.w * k,
                  height: c.h * k,
                  borderRadius: 8,
                  outline: `3px solid ${C.rotulador}`,
                  boxShadow: `0 0 0 8px rgba(255,228,92,0.35), 0 0 30px rgba(255,228,92,0.6)`,
                  opacity: latido(fr, ESCRIBE.inicio + ((c.y + c.h - r.y) / r.h) * ESCRIBE.dur + 4),
                }}
              />
            ))}
          </div>
          {/* Borde y sombra (shadow-lg) del formulario, como en la web */}
          <div
            style={{
              position: "absolute",
              left: fo.x * k,
              top: yFormulario * k,
              width: fo.w * k,
              height: fo.h * k,
              boxSizing: "border-box",
              borderRadius: 16 * k,
              border: `${k}px solid ${C.lineaFuerte}`,
              boxShadow: `0 ${10 * k}px ${15 * k}px ${-3 * k}px rgba(0,0,0,0.1), 0 ${4 * k}px ${6 * k}px ${-4 * k}px rgba(0,0,0,0.1)`,
            }}
          />
        </>
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
