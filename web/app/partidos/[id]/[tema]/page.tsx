import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BloqueTema } from "@/components/bloque-tema";
import { MigasJsonLd } from "@/components/json-ld";
import { Candidato, ProgramaBadge, TemaIcono } from "@/components/piezas";
import { candidatura, candidaturas, tema, temas, vigente } from "@/lib/data";
import { extracto, metaPagina, nombrePartido } from "@/lib/seo";

/** Una página por partido y tema (spec 002, HU-2.11): responde a «qué propone X sobre Y». */
export function generateStaticParams() {
  return candidaturas().flatMap((c) => temas().map((t) => ({ id: c.id, tema: t.id })));
}

function cargar(id: string, temaId: string) {
  const c = candidatura(id);
  const t = tema(temaId);
  if (!c || !t) return null;
  const v = vigente(c);
  const analisis = v.tipo === "programa" ? v.analisis.temas[t.id] : undefined;
  return { c, t, v, analisis };
}

export async function generateMetadata(
  props: PageProps<"/partidos/[id]/[tema]">,
): Promise<Metadata> {
  const { id, tema: temaId } = await props.params;
  const d = cargar(id, temaId);
  if (!d) return {};
  const { c, t, v, analisis } = d;
  const titulo = `${t.nombre}: qué propone ${c.corto} en su programa electoral`;
  const ruta = `/partidos/${c.id}/${t.id}`;
  if (!analisis?.menciona) {
    // Sin contenido propio: existe (simetría) pero no se indexa
    const motivo =
      v.tipo === "pendiente"
        ? `${nombrePartido(c)} aún no ha publicado su programa para el 29N.`
        : `${nombrePartido(c)} no menciona ${t.nombre.toLowerCase()} en su programa electoral${v.anterior ? " de 2023" : ""}.`;
    return {
      ...metaPagina({
        titulo,
        descripcion: `${motivo} Mira qué proponen los demás partidos sobre este tema.`,
        ruta,
      }),
      robots: { index: false, follow: true },
    };
  }
  // La descripción sale del resumen verificado del análisis: no se escribe texto nuevo
  const resumen = (analisis.resumen ?? []).map((r) => r.texto).join(" ");
  const anterior = v.tipo === "programa" && v.anterior ? " (programa de 2023)" : "";
  return metaPagina({ titulo, descripcion: extracto(`${c.corto}${anterior}: ${resumen}`), ruta });
}

export default async function PartidoTema(props: PageProps<"/partidos/[id]/[tema]">) {
  const { id, tema: temaId } = await props.params;
  const d = cargar(id, temaId);
  if (!d) notFound();
  const { c, t, v } = d;
  const otros = candidaturas().filter((x) => x.id !== c.id);
  const otrosTemas =
    v.tipo === "programa"
      ? temas().filter((x) => x.id !== t.id && v.analisis.temas[x.id]?.menciona)
      : [];
  const chip =
    "border-rule hover:border-rule-strong bg-paper-raised inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3 text-sm";

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <MigasJsonLd
        migas={[
          { nombre: "Partidos", ruta: "/partidos" },
          { nombre: c.corto, ruta: `/partidos/${c.id}` },
          { nombre: t.nombre, ruta: `/partidos/${c.id}/${t.id}` },
        ]}
      />
      <nav aria-label="Migas" className="text-ink-muted text-sm">
        <Link href="/partidos" className="hover:text-ink">
          Partidos
        </Link>{" "}
        /{" "}
        <Link href={`/partidos/${c.id}`} className="hover:text-ink">
          {c.corto}
        </Link>{" "}
        / {t.nombre}
      </nav>
      <header className="border-rule mt-4 border-b pb-6">
        <h1 className="flex flex-wrap items-center gap-x-3 gap-y-1 text-4xl font-medium sm:text-5xl">
          <TemaIcono icono={t.icono} className="text-ink-muted h-8 w-8" />
          <span>{t.nombre}:</span>{" "}
          <span>
            qué propone <Candidato c={c} />
          </span>
        </h1>
        <p className="text-ink-muted mt-3 text-lg">{c.nombre} · su programa electoral</p>
        <div className="mt-4">
          <ProgramaBadge v={v} />
        </div>
        {v.tipo === "programa" && v.anterior && (
          <p className="border-notice-rule bg-notice-bg text-notice-ink mt-4 rounded-md border p-3 text-sm">
            Estás viendo el programa de las generales de 2023. Cuando {c.corto} publique su programa
            para el 29N lo analizaremos y lo sustituiremos aquí.
          </p>
        )}
      </header>

      <section className="mt-8" aria-label={`Propuestas de ${c.corto} sobre ${t.nombre}`}>
        <BloqueTema c={c} v={v} temaId={t.id} temaNombre={t.nombre} abiertas />
      </section>

      <section className="border-rule mt-12 border-t pt-8" aria-labelledby="otros-h">
        <h2 id="otros-h" className="text-2xl font-medium">
          Qué proponen los demás partidos sobre {t.nombre.toLowerCase()}
        </h2>
        <ul className="mt-4 flex flex-wrap gap-2">
          {otros.map((o) => (
            <li key={o.id}>
              <Link href={`/partidos/${o.id}/${t.id}`} className={chip}>
                <Candidato c={o} />
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href={`/temas/${t.id}`}
            className="bg-ink text-paper inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-5 font-semibold"
          >
            Ver todos los partidos comparados <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
          <Link
            href={`/comparar?partidos=${c.id}&temas=${t.id}`}
            className="border-rule-strong hover:bg-paper-raised inline-flex min-h-11 items-center justify-center rounded-md border px-5 font-semibold"
          >
            Comparar {c.corto} con otros partidos
          </Link>
        </div>
      </section>

      {otrosTemas.length > 0 && (
        <section className="mt-12" aria-labelledby="temas-h">
          <h2 id="temas-h" className="text-xl font-medium">
            Más propuestas de {c.corto}
          </h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {otrosTemas.map((x) => (
              <li key={x.id}>
                <Link href={`/partidos/${c.id}/${x.id}`} className={chip}>
                  <TemaIcono icono={x.icono} className="h-4 w-4" /> {x.nombre}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
