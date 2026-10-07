import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { MigasJsonLd } from "@/components/json-ld";
import { Candidato } from "@/components/piezas";
import { VisorDocumento } from "@/components/visor-documento";
import { candidatura, fuente } from "@/lib/data";
import { metaPagina, nombrePartido } from "@/lib/seo";
import { CONVOCATORIAS, type ConvocatoriaId } from "@/lib/types";

export async function generateMetadata(
  props: PageProps<"/programas/[cand]/[conv]">,
): Promise<Metadata> {
  const { cand, conv } = await props.params;
  const c = candidatura(cand);
  const cv = CONVOCATORIAS[conv as ConvocatoriaId];
  return c && cv
    ? metaPagina({
        titulo: `${c.corto}: programa electoral completo (${cv.nombre})`,
        descripcion: `${nombrePartido(c)}: lee completo su programa electoral para las ${cv.nombre}, con buscador y enlace al documento oficial.`,
        ruta: `/programas/${c.id}/${conv}`,
      })
    : {};
}

export default async function Programa(props: PageProps<"/programas/[cand]/[conv]">) {
  const { cand, conv } = await props.params;
  const c = candidatura(cand);
  const cv = CONVOCATORIAS[conv as ConvocatoriaId];
  const f = cv ? fuente(conv as ConvocatoriaId, cand) : null;
  if (!c || !cv || !f) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <MigasJsonLd
        migas={[
          { nombre: "Partidos", ruta: "/partidos" },
          { nombre: c.corto, ruta: `/partidos/${c.id}` },
          { nombre: `Programa ${cv.corto}`, ruta: `/programas/${c.id}/${conv}` },
        ]}
      />
      <nav aria-label="Migas" className="text-ink-muted text-sm">
        <Link href={`/partidos/${c.id}`} className="hover:text-ink">
          {c.corto}
        </Link>{" "}
        / Programa {cv.corto}
      </nav>
      <header className="border-rule mt-3 flex flex-wrap items-end justify-between gap-3 border-b pb-4">
        <h1 className="text-3xl font-medium">
          <Candidato c={c} /> <span className="text-ink-muted">· {cv.nombre}</span>
        </h1>
        <div className="flex flex-wrap gap-3 text-sm">
          <a
            href={f.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center gap-1.5 hover:underline"
          >
            <ExternalLink aria-hidden className="h-4 w-4" /> Original
          </a>
          {f.url_archivo && (
            <a
              href={f.url_archivo}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center gap-1.5 hover:underline"
            >
              Copia en Internet Archive
            </a>
          )}
          <a
            href={`/documentos/${conv}/${cand}.pdf`}
            className="inline-flex min-h-11 items-center gap-1.5 hover:underline"
            download
          >
            Descargar PDF
          </a>
        </div>
      </header>
      <p className="text-ink-faint mt-3 text-xs break-all">
        Huella SHA-256: <span className="tabular">{f.sha256}</span> · archivado el{" "}
        {new Date(f.descargado).toLocaleDateString("es-ES")}
        {f.nota ? ` · ${f.nota}` : ""}
      </p>
      <Suspense>
        <VisorDocumento url={`/documentos/${conv}/${cand}.pdf`} paginas={f.paginas} />
      </Suspense>
    </div>
  );
}
