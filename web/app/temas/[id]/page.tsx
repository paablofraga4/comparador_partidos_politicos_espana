import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BloqueTema } from "@/components/bloque-tema";
import { Candidato, ProgramaBadge, TemaIcono } from "@/components/piezas";
import { candidaturas, tema, temas, vigente } from "@/lib/data";
import { metaPagina } from "@/lib/seo";

export function generateStaticParams() {
  return temas().map((t) => ({ id: t.id }));
}

export async function generateMetadata(props: PageProps<"/temas/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const t = tema(id);
  return t
    ? metaPagina({
        titulo: `${t.nombre}: qué proponen los partidos`,
        descripcion: `Qué propone cada partido sobre ${t.nombre.toLowerCase()} en su programa electoral para el 29N (${t.subtemas.slice(0, 3).join(", ")}…), comparado y con la página exacta de cada programa.`,
        ruta: `/temas/${t.id}`,
      })
    : {};
}

export default async function PaginaTema(props: PageProps<"/temas/[id]">) {
  const { id } = await props.params;
  const t = tema(id);
  if (!t) notFound();
  const cands = candidaturas();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <nav aria-label="Migas" className="text-ink-muted text-sm">
        <Link href="/temas" className="hover:text-ink">
          Temas
        </Link>{" "}
        / {t.nombre}
      </nav>
      <header className="border-rule mt-4 border-b pb-6">
        <h1 className="flex items-center gap-3 text-4xl font-medium sm:text-5xl">
          <TemaIcono icono={t.icono} className="text-ink-muted h-8 w-8" />
          {t.nombre}: qué propone cada partido
        </h1>
        <p className="text-ink-muted mt-3 max-w-2xl text-lg">{t.descripcion}</p>
        <p className="text-ink-faint mt-2 text-sm">Incluye: {t.subtemas.join(" · ")}</p>
        <Link
          href={`/comparar?temas=${t.id}`}
          className="border-rule-strong hover:bg-paper-raised mt-4 inline-flex min-h-11 items-center rounded-md border px-4 text-sm font-semibold"
        >
          Comparar solo algunos partidos
        </Link>
      </header>
      <ul className="mt-8 space-y-4">
        {cands.map((c) => {
          const v = vigente(c);
          return (
            <li
              key={c.id}
              className="border-rule bg-paper-raised rounded-lg border p-5"
              style={{ borderLeft: `4px solid ${c.color}` }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-xl font-semibold">
                  <Link href={`/partidos/${c.id}#${t.id}`} className="hover:underline">
                    <Candidato c={c} />
                  </Link>
                </h2>
                <ProgramaBadge v={v} />
              </div>
              <div className="mt-3">
                <BloqueTema c={c} v={v} temaId={t.id} temaNombre={t.nombre} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
