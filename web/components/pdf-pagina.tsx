"use client";

import { useEffect, useRef, useState } from "react";

type PDFDoc = import("pdfjs-dist").PDFDocumentProxy;
export type RectNorm = { pagina: number; r: [number, number, number, number] };

const docs = new Map<string, Promise<PDFDoc>>();

/** Carga (una sola vez por URL) un PDF con peticiones por rangos: solo baja lo necesario. */
export function loadPdf(url: string): Promise<PDFDoc> {
  let p = docs.get(url);
  if (!p) {
    p = import("pdfjs-dist").then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      return pdfjs.getDocument({
        url,
        rangeChunkSize: 1 << 16,
        disableAutoFetch: true,
        disableStream: true,
      }).promise;
    });
    docs.set(url, p);
    p.catch(() => docs.delete(url));
  }
  return p;
}

/**
 * Renderiza una página del PDF ajustada al ancho del contenedor, con los rectángulos de la
 * cita resaltados encima (multiply). Llama a `onRendered(primerRectEnPx)` para hacer scroll.
 */
export function PdfPagina({
  url,
  pagina,
  rects,
  onRendered,
  alt,
}: {
  url: string;
  pagina: number;
  rects: RectNorm[];
  onRendered?: (firstRectTop: number | null) => void;
  alt: string;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let task: { cancel: () => void } | null = null;
    async function render() {
      try {
        setError(null);
        const doc = await loadPdf(url);
        const page = await doc.getPage(pagina);
        if (cancelled || !wrap.current || !canvas.current) return;
        const cssWidth = wrap.current.clientWidth;
        const base = page.getViewport({ scale: 1 });
        const scale = cssWidth / base.width;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const viewport = page.getViewport({ scale: scale * dpr });
        const c = canvas.current;
        c.width = Math.floor(viewport.width);
        c.height = Math.floor(viewport.height);
        const h = (base.height * cssWidth) / base.width;
        setSize({ w: cssWidth, h });
        const t = page.render({ canvas: c, viewport });
        task = t;
        await t.promise;
        if (cancelled) return;
        const own = rects.filter((r) => r.pagina === pagina);
        onRendered?.(own.length ? Math.min(...own.map((r) => r.r[1])) * h : null);
      } catch (e) {
        if (!cancelled && (e as Error)?.name !== "RenderingCancelledException") {
          setError("No se ha podido cargar el documento. Prueba con el enlace al original.");
        }
      }
    }
    render();
    return () => {
      cancelled = true;
      task?.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, pagina]);

  const own = rects.filter((r) => r.pagina === pagina);
  return (
    <div ref={wrap} className="relative w-full">
      {error ? (
        <p className="border-rule bg-paper-sunken rounded-md border p-4 text-sm">{error}</p>
      ) : (
        <div
          className="ring-rule relative overflow-hidden rounded-sm bg-white shadow-sm ring-1"
          style={size ? { height: size.h } : { aspectRatio: "1 / 1.414" }}
        >
          <canvas
            ref={canvas}
            role="img"
            aria-label={alt}
            className="absolute inset-0 h-full w-full"
          />
          {size &&
            own.map((r, i) => (
              <span
                key={i}
                aria-hidden
                className="absolute rounded-[2px] mix-blend-multiply"
                style={{
                  left: `${r.r[0] * 100}%`,
                  top: `${r.r[1] * 100}%`,
                  width: `${(r.r[2] - r.r[0]) * 100}%`,
                  height: `${(r.r[3] - r.r[1]) * 100}%`,
                  background: "rgb(255 220 40 / 0.55)",
                  boxShadow: "0 0 0 2px rgb(255 220 40 / 0.35)",
                }}
              />
            ))}
          {!size && <div className="bg-paper-sunken absolute inset-0 animate-pulse" aria-hidden />}
        </div>
      )}
    </div>
  );
}
