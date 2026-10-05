"use client";

import { ChevronLeft, ChevronRight, Copy, ExternalLink, FileText, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useQueryState } from "nuqs";
import { useCallback, useEffect, useRef, useState } from "react";

import { limpiarLiteral } from "@/lib/reglas";
import { FUENTE_PARAM, fuenteParser } from "./cita";
import { PdfPagina, type RectNorm } from "./pdf-pagina";

type Datos = {
  cita: {
    pagina: number;
    pagina_impresa?: string | null;
    literal: string;
    idioma: string;
    traduccion?: string | null;
    rects: RectNorm[];
    resaltada: boolean;
  };
  convocatoria: { id: string; nombre: string; corto: string };
  candidatura: { id: string; nombre: string; corto: string; color: string };
  documento: { url: string; original: string; archivo: string | null; paginas: number };
};

/**
 * Panel de fuente (spec 002, HU-2.3): lateral en escritorio, pantalla completa en móvil.
 * Muestra la página exacta del programa con el fragmento citado resaltado y visible.
 */
export function FuentePanel() {
  const [fuente, setFuente] = useQueryState(FUENTE_PARAM, fuenteParser);
  // Resultado asociado a la cita que lo pidió: si cambia la cita, el anterior deja de valer
  const [res, setRes] = useState<{ key: string; datos?: Datos; error?: boolean } | null>(null);
  const [paginaVista, setPaginaVista] = useState<{ key: string; pagina: number } | null>(null);
  const [copiado, setCopiado] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const opener = useRef<Element | null>(null);

  const datos = res && res.key === fuente ? (res.datos ?? null) : null;
  const error = !!(res && res.key === fuente && res.error);
  const pagina =
    paginaVista && paginaVista.key === fuente ? paginaVista.pagina : (datos?.cita.pagina ?? null);
  const setPagina = (fn: (p: number | null) => number) =>
    fuente && setPaginaVista({ key: fuente, pagina: fn(pagina) });

  const cerrar = useCallback(() => setFuente(null), [setFuente]);

  useEffect(() => {
    if (!fuente) {
      (opener.current as HTMLElement | null)?.focus?.();
      return;
    }
    opener.current = document.activeElement;
    const [conv, cand, cid] = fuente.split(".");
    let cancel = false;
    fetch(`/api/citas/${conv}/${cand}/${cid}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: Datos) => {
        if (cancel) return;
        setRes({ key: fuente, datos: d });
        requestAnimationFrame(() => closeBtn.current?.focus());
      })
      .catch(() => !cancel && setRes({ key: fuente, error: true }));
    return () => {
      cancel = true;
    };
  }, [fuente]);

  useEffect(() => {
    if (!fuente) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && cerrar();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [fuente, cerrar]);

  const alRenderizar = useCallback((top: number | null) => {
    const el = scroller.current;
    if (el && top !== null) {
      el.scrollTo({ top: Math.max(top - el.clientHeight * 0.3, 0), behavior: "smooth" });
    }
  }, []);

  const etiqueta = datos ? (datos.cita.pagina_impresa ?? String(datos.cita.pagina)) : "";
  const esPaginaCita = datos && pagina === datos.cita.pagina;

  return (
    <AnimatePresence>
      {fuente && (
        <motion.div
          className="fixed inset-0 z-50 flex justify-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <button
            aria-label="Cerrar la fuente"
            tabIndex={-1}
            className="bg-ink/30 absolute inset-0"
            onClick={cerrar}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={
              datos
                ? `Fuente: programa de ${datos.candidatura.corto}, página ${etiqueta}`
                : "Fuente"
            }
            className="bg-paper-raised relative flex h-full w-full flex-col shadow-2xl sm:max-w-[520px]"
            initial={{ x: 40, opacity: 0.6 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <header className="border-rule flex items-start gap-3 border-b px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-ink-muted text-xs font-semibold tracking-wide uppercase">
                  Fuente
                </p>
                {datos ? (
                  <p className="truncate font-serif text-lg">
                    <span
                      aria-hidden
                      className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle"
                      style={{ background: datos.candidatura.color }}
                    />
                    Programa de {datos.candidatura.corto} · {datos.convocatoria.nombre}
                  </p>
                ) : (
                  <p className="bg-paper-sunken h-7 w-48 animate-pulse rounded" />
                )}
              </div>
              <button
                ref={closeBtn}
                onClick={cerrar}
                className="hover:bg-paper-sunken grid h-11 w-11 place-items-center rounded-full"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div ref={scroller} className="flex-1 overflow-y-auto px-4 py-4">
              {error && (
                <p className="border-rule rounded-md border p-4 text-sm">
                  No hemos encontrado esta cita. Puede que el análisis se haya actualizado.
                </p>
              )}
              {datos && pagina !== null && (
                <>
                  <PdfPagina
                    url={datos.documento.url}
                    pagina={pagina}
                    rects={datos.cita.rects}
                    onRendered={esPaginaCita ? alRenderizar : undefined}
                    alt={`Página ${pagina} del programa. Fragmento resaltado: ${limpiarLiteral(datos.cita.literal)}`}
                  />
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <button
                      className="hover:bg-paper-sunken inline-flex min-h-11 items-center gap-1 rounded-md px-2 disabled:opacity-40"
                      disabled={pagina <= 1}
                      onClick={() => setPagina((p) => (p ?? 2) - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" /> Anterior
                    </button>
                    <span className="tabular text-ink-muted">
                      Página {pagina} de {datos.documento.paginas}
                      {!esPaginaCita && (
                        <>
                          {" · "}
                          <button
                            className="underline"
                            onClick={() => setPagina(() => datos.cita.pagina)}
                          >
                            volver a la cita
                          </button>
                        </>
                      )}
                    </span>
                    <button
                      className="hover:bg-paper-sunken inline-flex min-h-11 items-center gap-1 rounded-md px-2 disabled:opacity-40"
                      disabled={pagina >= datos.documento.paginas}
                      onClick={() => setPagina((p) => (p ?? 0) + 1)}
                    >
                      Siguiente <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>

                  <figure className="mt-5 border-l-2 border-[var(--marker)] pl-4">
                    <blockquote className="font-serif text-lg leading-snug">
                      «{limpiarLiteral(datos.cita.literal)}»
                    </blockquote>
                    {datos.cita.traduccion && (
                      <p className="text-ink-muted mt-2 text-sm">
                        <span className="font-semibold">Traducción automática:</span> «
                        {datos.cita.traduccion}»
                      </p>
                    )}
                    <figcaption className="text-ink-muted mt-2 text-sm">
                      {datos.candidatura.nombre} · {datos.convocatoria.nombre} · página {etiqueta}
                      {!datos.cita.resaltada && " · fragmento sin resaltar en la imagen"}
                    </figcaption>
                  </figure>
                </>
              )}
            </div>

            {datos && (
              <footer className="border-rule grid grid-cols-3 gap-2 border-t px-3 py-2.5 text-xs sm:text-sm">
                <Link
                  href={`/programas/${datos.candidatura.id}/${datos.convocatoria.id}?pagina=${datos.cita.pagina}&${FUENTE_PARAM}=${fuente}`}
                  className="bg-ink text-paper inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md px-3 font-medium hover:opacity-90"
                >
                  <FileText className="h-4 w-4 shrink-0" /> Documento
                </Link>
                <a
                  href={datos.documento.original}
                  target="_blank"
                  rel="noreferrer"
                  className="border-rule hover:border-rule-strong inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md border px-3"
                >
                  <ExternalLink className="h-4 w-4 shrink-0" /> Original
                </a>
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(window.location.href);
                    setCopiado(true);
                    setTimeout(() => setCopiado(false), 1800);
                  }}
                  className="border-rule hover:border-rule-strong inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md border px-3"
                >
                  <Copy className="h-4 w-4 shrink-0" /> {copiado ? "¡Copiado!" : "Enlace"}
                </button>
              </footer>
            )}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
