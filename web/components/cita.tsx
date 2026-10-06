"use client";

import { parseAsString } from "nuqs";

/** Clave de una cita en la URL: «convocatoria.candidatura.idCita» (URL propia, compartible). */
export const FUENTE_PARAM = "fuente";
export const fuenteParser = parseAsString.withOptions({ history: "push", scroll: false });

export const EVENTO_FUENTE = "votoclaro:abrir-fuente";

/** Pide al panel de fuente (montado en el layout) que se abra. La marca no lee la URL: así las
 * páginas estáticas no necesitan <Suspense> por cada cita. El panel actualiza ?fuente=…
 * (URL propia y compartible) y gestiona el historial. */
export function abrirFuente(valor: string) {
  window.dispatchEvent(new CustomEvent<string>(EVENTO_FUENTE, { detail: valor }));
}

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
  return (
    <button
      type="button"
      onClick={() => abrirFuente(`${conv}.${cand}.${cid}`)}
      aria-label={`Fuente: programa de ${candCorto} ${convCorto}, página ${pagina}`}
      className="marker tabular text-ink mx-0.5 inline-flex min-h-6 items-baseline rounded-sm px-1 align-baseline text-[0.8em] font-semibold decoration-transparent transition-colors hover:bg-[var(--marker-soft)] focus-visible:bg-[var(--marker-soft)]"
    >
      p.&nbsp;{pagina}
    </button>
  );
}
