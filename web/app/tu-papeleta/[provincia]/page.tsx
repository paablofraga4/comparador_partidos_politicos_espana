import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MigasJsonLd } from "@/components/json-ld";
import { RecordarProvincia } from "@/components/papeleta";
import { circunscripciones, fuenteBoe, listaPapeleta, registro } from "@/lib/data";
import { CALENDARIO, DECRETO, DIPUTADOS_POR_ID } from "@/lib/elecciones";
import { enProvincia, etiquetaPapeleta } from "@/lib/papeleta";
import { extracto, metaPagina } from "@/lib/seo";

/** Una página por circunscripción (spec 006): responde a «quién se presenta en {provincia}». */
export const dynamicParams = false;

export function generateStaticParams() {
  return circunscripciones().map((p) => ({ provincia: p.id }));
}

const proclamacion = CALENDARIO.find((h) => h.hito.startsWith("Proclamación"))?.fecha;

function cargar(id: string) {
  const prov = circunscripciones().find((p) => p.id === id);
  if (!prov) return null;
  const lista = enProvincia(listaPapeleta(), id);
  return { prov, lista, diputados: DIPUTADOS_POR_ID[id] };
}

const tituloDe = (nombre: string) =>
  `Candidaturas al Congreso en ${nombre}: quién se presenta el 29N`;

export async function generateMetadata(
  props: PageProps<"/tu-papeleta/[provincia]">,
): Promise<Metadata> {
  const { provincia } = await props.params;
  const d = cargar(provincia);
  if (!d) return {};
  const { prov, lista, diputados } = d;
  const fase = registro().fase_inclusion === "proclamadas" ? "proclamadas" : "presentadas";
  return metaPagina({
    titulo: tituloDe(prov.nombre),
    descripcion: extracto(
      `${lista.length} candidaturas ${fase} al Congreso en ${prov.nombre} (se eligen ${diputados} diputados), según el BOE: ${lista.map((c) => c.corto).join(", ")}.`,
    ),
    ruta: `/tu-papeleta/${prov.id}`,
  });
}

export default async function PapeletaProvincia(props: PageProps<"/tu-papeleta/[provincia]">) {
  const { provincia } = await props.params;
  const d = cargar(provincia);
  if (!d) notFound();
  const { prov, lista, diputados } = d;
  const otras = circunscripciones().filter((p) => p.id !== prov.id);
  const proclamadas = registro().fase_inclusion === "proclamadas";
  const boe = fuenteBoe();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <RecordarProvincia id={prov.id} />
      <MigasJsonLd
        migas={[
          { nombre: "Tu papeleta", ruta: "/tu-papeleta" },
          { nombre: prov.nombre, ruta: `/tu-papeleta/${prov.id}` },
        ]}
      />
      <nav aria-label="Migas" className="text-ink-muted text-sm">
        <Link href="/tu-papeleta" className="hover:text-ink">
          Tu papeleta
        </Link>{" "}
        / {prov.nombre}
      </nav>
      <h1 className="mt-4 text-4xl font-medium sm:text-5xl">{tituloDe(prov.nombre)}</h1>
      <p className="text-ink-muted mt-3 max-w-2xl text-lg">
        En {prov.nombre} se {proclamadas ? "han proclamado" : "presentan"} {lista.length}{" "}
        candidaturas al Congreso de los Diputados, donde se eligen {diputados}{" "}
        {diputados === 1 ? "diputado" : "diputados"}.
      </p>
      <p className="text-ink-faint mt-2 max-w-2xl text-sm">
        {proclamadas
          ? "Candidaturas proclamadas, según el BOE"
          : `Candidaturas presentadas, según el BOE. Se proclaman el ${proclamacion ?? "2 y 3 de noviembre"}`}
        {boe && (
          <>
            {" "}
            (
            <a
              className="underline"
              href={`https://www.boe.es/diario_boe/txt.php?id=${boe}`}
              target="_blank"
              rel="noreferrer"
            >
              {boe}
            </a>
            )
          </>
        )}
        . Diputados por circunscripción: {DECRETO.corto} ({DECRETO.boe}). Orden alfabético.
      </p>

      <ul className="mt-6 grid gap-2 sm:grid-cols-2">
        {lista.map((c) => {
          const local = c.listas[prov.id];
          return (
            <li key={c.id}>
              <Link
                href={`/partidos/${c.id}`}
                className="border-rule bg-paper-raised hover:border-rule-strong flex h-full flex-col gap-1 rounded-lg border p-4"
                style={{ borderLeft: `4px solid ${c.color}` }}
              >
                <span className="font-semibold">{c.corto}</span>
                {local && local.toLowerCase() !== c.corto.toLowerCase() && (
                  <span className="text-ink-muted text-sm">En tu papeleta: {local}</span>
                )}
                <span className="text-ink-faint text-xs">{etiquetaPapeleta(c)}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      {lista.length > 1 && (
        <Link
          href={`/comparar?partidos=${lista.map((c) => c.id).join(",")}`}
          className="bg-ink text-paper mt-6 inline-flex min-h-12 items-center gap-2 rounded-md px-5 font-semibold"
        >
          Comparar las candidaturas de mi papeleta <ArrowRight aria-hidden className="h-5 w-5" />
        </Link>
      )}

      <section className="border-rule mt-12 border-t pt-8" aria-labelledby="otras-h">
        <h2 id="otras-h" className="text-2xl font-medium">
          Candidaturas en otras circunscripciones
        </h2>
        <ul className="mt-3 grid grid-cols-2 gap-x-4 sm:grid-cols-3">
          {otras.map((p) => (
            <li key={p.id}>
              <Link
                href={`/tu-papeleta/${p.id}`}
                className="inline-flex min-h-11 items-center underline-offset-4 hover:underline"
              >
                {p.nombre}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
