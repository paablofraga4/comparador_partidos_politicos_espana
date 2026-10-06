import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";

import { Cierre, Compara, Facil, Fuente, Gancho, Pregunta, Principios } from "./escenas";
import { EASE, type Formato } from "./tema";

export type PropsPromo = { formato: Formato; url: string };

/** Duración de cada escena (fotogramas a 30 fps) y del fundido entre escenas. */
const ESCENAS = [
  { id: "gancho", dur: 120 },
  { id: "compara", dur: 210 },
  { id: "fuente", dur: 270 },
  { id: "facil", dur: 180 },
  { id: "pregunta", dur: 270 },
  { id: "principios", dur: 150 },
  { id: "cierre", dur: 165 },
] as const;
const FUNDIDO = 12;

export const DURACION = ESCENAS.reduce((s, e) => s + e.dur, 0) - FUNDIDO * (ESCENAS.length - 1);

export function Promo({ formato, url }: PropsPromo) {
  const piezas = {
    gancho: <Gancho formato={formato} />,
    compara: <Compara formato={formato} />,
    fuente: <Fuente formato={formato} />,
    facil: <Facil formato={formato} />,
    pregunta: <Pregunta formato={formato} />,
    principios: <Principios formato={formato} />,
    cierre: <Cierre formato={formato} url={url} />,
  };
  return (
    <TransitionSeries>
      {ESCENAS.flatMap((e, i) => [
        ...(i > 0
          ? [
              <TransitionSeries.Transition
                key={`t-${e.id}`}
                presentation={fade()}
                timing={linearTiming({ durationInFrames: FUNDIDO, easing: EASE })}
              />,
            ]
          : []),
        <TransitionSeries.Sequence key={e.id} durationInFrames={e.dur}>
          {piezas[e.id]}
        </TransitionSeries.Sequence>,
      ])}
    </TransitionSeries>
  );
}
