import { Composition } from "remotion";

import { DURACION, Promo, type PropsPromo } from "./Promo";
import { FPS } from "./tema";

/** Cambia la URL aquí (o con --props) cuando haya dominio propio. */
const URL_PUBLICA = "comparadorpartidospoliticosespana-production.up.railway.app";

export function Root() {
  return (
    <>
      <Composition
        id="PromoHorizontal"
        component={Promo}
        durationInFrames={DURACION}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{ formato: "horizontal", url: URL_PUBLICA } satisfies PropsPromo}
      />
      <Composition
        id="PromoVertical"
        component={Promo}
        durationInFrames={DURACION}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{ formato: "vertical", url: URL_PUBLICA } satisfies PropsPromo}
      />
    </>
  );
}
