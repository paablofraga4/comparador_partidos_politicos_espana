"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { parseAsInteger, useQueryState } from "nuqs";
import { useEffect, useState } from "react";

import { FUENTE_PARAM, fuenteParser } from "./cita";
import { PdfPagina, type RectNorm } from "./pdf-pagina";

/** Visor del documento completo (spec 002, HU-2.4), con la cita resaltada si viene en la URL. */
export function VisorDocumento({ url, paginas }: { url: string; paginas: number }) {
  const [pagina, setPagina] = useQueryState(
    "pagina",
    parseAsInteger.withDefault(1).withOptions({ history: "replace", scroll: false }),
  );
  const [fuente] = useQueryState(FUENTE_PARAM, fuenteParser);
  const [citaRects, setCitaRects] = useState<{ key: string; rects: RectNorm[] } | null>(null);
  // Borrador de lo que se escribe en el campo de página (null = mostrar la página actual)
  const [borrador, setBorrador] = useState<string | null>(null);
  const rects = citaRects && citaRects.key === fuente ? citaRects.rects : [];

  useEffect(() => {
    if (!fuente) return;
    const [conv, cand, cid] = fuente.split(".");
    fetch(`/api/citas/${conv}/${cand}/${cid}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setCitaRects({ key: fuente, rects: d.cita.rects }));
  }, [fuente]);

  const ir = (p: number) => {
    setBorrador(null);
    setPagina(Math.min(Math.max(1, p), paginas));
  };
  const entrada = borrador ?? String(pagina);
  const setEntrada = setBorrador;

  return (
    <div className="mt-6">
      <div className="border-rule bg-paper/95 sticky top-[57px] z-10 mb-4 flex items-center justify-between gap-2 border-b py-2 backdrop-blur">
        <button
          className="hover:bg-paper-sunken inline-flex min-h-11 items-center gap-1 rounded-md px-2 disabled:opacity-40"
          disabled={pagina <= 1}
          onClick={() => ir(pagina - 1)}
        >
          <ChevronLeft aria-hidden className="h-4 w-4" /> Anterior
        </button>
        <form
          className="flex items-center gap-2 text-sm"
          onSubmit={(e) => {
            e.preventDefault();
            ir(Number(entrada) || 1);
          }}
        >
          <label htmlFor="pagina" className="text-ink-muted">
            Página
          </label>
          <input
            id="pagina"
            inputMode="numeric"
            value={entrada}
            onChange={(e) => setEntrada(e.target.value)}
            className="tabular border-rule bg-paper-raised h-10 w-16 rounded-md border text-center"
          />
          <span className="tabular text-ink-muted">de {paginas}</span>
        </form>
        <button
          className="hover:bg-paper-sunken inline-flex min-h-11 items-center gap-1 rounded-md px-2 disabled:opacity-40"
          disabled={pagina >= paginas}
          onClick={() => ir(pagina + 1)}
        >
          Siguiente <ChevronRight aria-hidden className="h-4 w-4" />
        </button>
      </div>
      <PdfPagina
        url={url}
        pagina={pagina}
        rects={rects}
        alt={`Página ${pagina} del programa`}
        onRendered={(top) => {
          if (top !== null) window.scrollTo({ top: top + 200, behavior: "smooth" });
        }}
      />
    </div>
  );
}
