import type { Metadata } from "next";
import Link from "next/link";

import { BloqueTema } from "@/components/bloque-tema";
import { Candidato, ProgramaBadge, TemaIcono } from "@/components/piezas";
import { Selector } from "@/components/selector";
import { candidaturas, temas, vigente } from "@/lib/data";

export const metadata: Metadata = {
  title: "Comparar partidos",
  description:
    "Elige partidos y temas y compara sus propuestas para el 29N, con cada frase enlazada a su programa.",
};

const lista = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v.join(",") : (v ?? "")).split(",").filter(Boolean);

export default async function Comparar(props: PageProps<"/comparar">) {
  const sp = await props.searchParams;
  const todas = candidaturas();
  const todosTemas = temas();
  // Orden alfabético SIEMPRE (constitución I.2), aunque se seleccionen en otro orden
  const pids = new Set(lista(sp.partidos));
  const cands = todas.filter((c) => pids.has(c.id));
  const tids = new Set(lista(sp.temas));
  const ts = todosTemas.filter((t) => tids.has(t.id));
  const vig = new Map(cands.map((c) => [c.id, vigente(c)]));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="text-4xl font-medium sm:text-5xl">Comparar</h1>
      <div className="border-rule bg-paper-raised mt-6 rounded-xl border p-4 sm:p-6">
        <Selector
          partidos={todas.map((c) => ({ id: c.id, etiqueta: c.corto, color: c.color }))}
          temas={todosTemas.map((t) => ({ id: t.id, etiqueta: t.nombre, icono: t.icono }))}
        />
      </div>

      {cands.length === 0 || ts.length === 0 ? (
        <p className="text-ink-muted mt-10 text-center text-lg">
          {cands.length === 0 ? "Elige al menos un partido" : "Elige al menos un tema"} para ver la
          comparación.
        </p>
      ) : cands.length === 1 ? (
        <p className="text-ink-muted mt-6 text-sm">
          Has elegido un solo partido.{" "}
          <Link className="underline" href={`/partidos/${cands[0].id}`}>
            Ver todo su programa
          </Link>
        </p>
      ) : null}

      {cands.length > 0 &&
        ts.map((t) => (
          <section key={t.id} className="mt-10" aria-labelledby={`h-${t.id}`}>
            <h2 id={`h-${t.id}`} className="flex items-center gap-2 text-2xl font-medium">
              <TemaIcono icono={t.icono} className="text-ink-muted h-5 w-5" />
              {t.nombre}
            </h2>
            {/* Escritorio: columnas · Móvil: tarjetas deslizables (HU-2.2) */}
            <div
              className="mt-4 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 md:grid md:snap-none md:overflow-visible"
              style={{
                gridTemplateColumns: `repeat(${Math.min(cands.length, 4)}, minmax(0, 1fr))`,
              }}
              tabIndex={0}
              aria-label={`${t.nombre}: ${cands.length} partidos. Desliza para ver todos.`}
            >
              {cands.map((c, i) => {
                const v = vig.get(c.id)!;
                return (
                  <article
                    key={c.id}
                    className="border-rule bg-paper-raised w-[85%] shrink-0 snap-start rounded-lg border p-4 md:w-auto"
                    style={{ borderTop: `3px solid ${c.color}` }}
                    aria-label={`${c.corto} sobre ${t.nombre}`}
                  >
                    <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-sans text-lg font-semibold">
                        <Link href={`/partidos/${c.id}#${t.id}`} className="hover:underline">
                          <Candidato c={c} />
                        </Link>
                      </h3>
                      <span className="text-ink-faint text-xs md:hidden">
                        {i + 1}/{cands.length}
                      </span>
                    </header>
                    <ProgramaBadge v={v} />
                    <div className="mt-3">
                      <BloqueTema c={c} v={v} temaId={t.id} temaNombre={t.nombre} />
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
    </div>
  );
}
