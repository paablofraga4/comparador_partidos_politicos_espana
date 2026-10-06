import { ExternalLink, FileText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BloqueTema } from "@/components/bloque-tema";
import { Candidato, ProgramaBadge, TemaIcono } from "@/components/piezas";
import { candidatura, candidaturas, temas, vigente } from "@/lib/data";
import { metaPagina, nombrePartido } from "@/lib/seo";
import { CONVOCATORIAS } from "@/lib/types";

export function generateStaticParams() {
  return candidaturas().map((c) => ({ id: c.id }));
}

export async function generateMetadata(props: PageProps<"/partidos/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const c = candidatura(id);
  if (!c) return {};
  const v = vigente(c);
  const ruta = `/partidos/${c.id}`;
  const titulo = `${c.corto}: programa electoral y propuestas, tema a tema`;
  // Honesto con lo que se muestra: sin programa propio, o con el de 2023, la descripción lo dice
  if (v.tipo === "pendiente") {
    const dentro = v.dentroDe ? candidatura(v.dentroDe) : undefined;
    return metaPagina({
      titulo,
      descripcion: `${nombrePartido(c)}: ${dentro ? `en 2023 se presentó dentro de ${dentro.corto}. ` : ""}Su programa electoral para el 29N aparecerá aquí, explicado por temas, en cuanto se publique.`,
      ruta,
    });
  }
  const aviso = v.anterior ? " Hasta que publique el del 29N, es su programa de 2023." : "";
  return metaPagina({
    titulo,
    descripcion: `${nombrePartido(c)}: sus propuestas en vivienda, empleo, pensiones, sanidad, impuestos y más, explicadas claro y con la página exacta de su programa oficial.${aviso}`,
    ruta,
  });
}

export default async function FichaCandidatura(props: PageProps<"/partidos/[id]">) {
  const { id } = await props.params;
  const c = candidatura(id);
  if (!c) notFound();
  const v = vigente(c);
  const ts = temas();
  const conTema = v.tipo === "programa" ? ts.filter((t) => v.analisis.temas[t.id]?.menciona) : [];
  const sinTema = v.tipo === "programa" ? ts.filter((t) => !v.analisis.temas[t.id]?.menciona) : [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <nav aria-label="Migas" className="text-ink-muted text-sm">
        <Link href="/partidos" className="hover:text-ink">
          Partidos
        </Link>{" "}
        / {c.corto}
      </nav>
      <header className="border-rule mt-4 border-b pb-6">
        <h1 className="text-4xl font-medium sm:text-5xl">
          <Candidato c={c} />
        </h1>
        <p className="text-ink-muted mt-2 text-lg">
          {c.nombre} · su programa electoral, tema a tema
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <ProgramaBadge v={v} />
          {v.tipo === "programa" && v.fuente && (
            <>
              <Link
                href={`/programas/${c.id}/${v.convocatoria}`}
                className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold underline-offset-4 hover:underline"
              >
                <FileText aria-hidden className="h-4 w-4" /> Leer el programa completo (
                {v.fuente.paginas} págs.)
              </Link>
              <a
                href={v.fuente.url}
                target="_blank"
                rel="noreferrer"
                className="text-ink-muted hover:text-ink inline-flex min-h-11 items-center gap-1.5 text-sm"
              >
                <ExternalLink aria-hidden className="h-4 w-4" /> Original en su web
              </a>
            </>
          )}
        </div>
        {v.tipo === "programa" && v.anterior && (
          <p className="border-notice-rule bg-notice-bg text-notice-ink mt-4 rounded-md border p-3 text-sm">
            Estás viendo el programa de las generales de 2023. Cuando {c.corto} publique su programa
            para el 29N lo analizaremos y lo sustituiremos aquí.
          </p>
        )}
      </header>

      {v.tipo === "pendiente" ? (
        <p className="text-ink-muted mt-8 text-lg">
          {c.corto} aún no ha publicado su programa para el 29N.{" "}
          {v.dentroDe &&
            `En 2023 concurrió dentro de otra candidatura, así que no tiene un programa anterior propio que mostrar.`}
        </p>
      ) : (
        <>
          <nav aria-label="Temas" className="mt-6 flex flex-wrap gap-2">
            {conTema.map((t) => (
              <a
                key={t.id}
                href={`#${t.id}`}
                className="border-rule hover:border-rule-strong inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-sm"
              >
                <TemaIcono icono={t.icono} className="h-4 w-4" /> {t.nombre}
              </a>
            ))}
          </nav>
          <div className="mt-8 space-y-10">
            {conTema.map((t) => (
              <section key={t.id} id={t.id} className="scroll-mt-28" aria-labelledby={`${t.id}-h`}>
                <h2 id={`${t.id}-h`} className="flex items-center gap-2 text-2xl font-medium">
                  <TemaIcono icono={t.icono} className="text-ink-muted h-5 w-5" />
                  <Link href={`/temas/${t.id}`} className="hover:underline">
                    {t.nombre}
                  </Link>
                </h2>
                <div className="mt-3">
                  <BloqueTema c={c} v={v} temaId={t.id} temaNombre={t.nombre} abiertas />
                </div>
              </section>
            ))}
          </div>
          {sinTema.length > 0 && (
            <section className="border-rule bg-paper-raised mt-12 rounded-lg border p-5">
              <h2 className="text-xl">Temas que no menciona en su programa</h2>
              <p className="text-ink-muted mt-2">{sinTema.map((t) => t.nombre).join(" · ")}</p>
              <p className="text-ink-faint mt-2 text-sm">
                Revisado con una segunda lectura automática del programa completo. Fuente:{" "}
                {CONVOCATORIAS[v.convocatoria].nombre}.
              </p>
            </section>
          )}
        </>
      )}
    </div>
  );
}
