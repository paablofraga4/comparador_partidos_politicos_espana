"use client";

import { parseAsString, useQueryState } from "nuqs";

/** Clave de una cita en la URL: «convocatoria.candidatura.idCita» (URL propia, compartible). */
export const FUENTE_PARAM = "fuente";
export const fuenteParser = parseAsString.withOptions({ history: "push", scroll: false });

/**
 * Marca de cita «p. 45» (skill grounding): abre el panel de fuente con la página del programa
 * y el fragmento resaltado.
 */
export function CitaMark({
  conv,
  cand,
  cid,
  pagina,
  candCorto,
  convCorto,
}: {
  conv: string;
  cand: string;
  cid: string;
  pagina: string;
  candCorto: string;
  convCorto: string;
}) {
  const [, setFuente] = useQueryState(FUENTE_PARAM, fuenteParser);
  return (
    <button
      type="button"
      onClick={() => setFuente(`${conv}.${cand}.${cid}`)}
      aria-label={`Fuente: programa de ${candCorto} ${convCorto}, página ${pagina}`}
      className="marker tabular text-ink mx-0.5 inline-flex min-h-6 items-baseline rounded-sm px-1 align-baseline text-[0.8em] font-semibold decoration-transparent transition-colors hover:bg-[var(--marker-soft)] focus-visible:bg-[var(--marker-soft)]"
    >
      p.&nbsp;{pagina}
    </button>
  );
}
