import { ArrowRight, BookOpenCheck, Columns3, Quote } from "lucide-react";
import Link from "next/link";

import { SeccionMantenimiento } from "@/components/apoyos";
import { Candidato, ProgramaBadge, TemaIcono } from "@/components/piezas";
import { candidaturas, costesFijos, estadoProgramas29N, registro, temas, vigente } from "@/lib/data";
import { metaPagina } from "@/lib/seo";
import { urlDelSitio } from "@/lib/sitio";

// SEO centrado en el contenido (lo que se busca), no en la marca
const DESCRIPCION =
  "Entiende los programas electorales del 29N: las propuestas de cada partido, tema a tema, explicadas claro y con la página exacta del programa oficial.";

export const metadata = metaPagina({
  titulo: "Qué propone cada partido el 29N: programas electorales explicados",
  descripcion: DESCRIPCION,
  ruta: "/",
});

/** Datos estructurados para buscadores (spec 002, HU-2.9): qué es el sitio, sin valoraciones. */
function DatosEstructurados() {
  const url = urlDelSitio(process.env.NEXT_PUBLIC_SITE_URL).origin;
  const datos = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "VotoClaro",
    url,
    inLanguage: "es-ES",
    description: DESCRIPCION,
    publisher: { "@type": "Organization", name: "VotoClaro", url },
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(datos).replace(/</g, "\\u003c") }}
    />
  );
}

export default function Inicio() {
  const cands = candidaturas();
  const ts = temas();
  const estado = estadoProgramas29N();
  const provisional = registro().fase_inclusion === "provisional";

  return (
    <>
      <DatosEstructurados />
      <section className="border-rule border-b">
        <div className="mx-auto max-w-6xl px-4 pt-14 pb-12 sm:px-6 sm:pt-20">
          <p className="text-ink-muted text-sm font-semibold tracking-wide uppercase">
            Elecciones generales · 29 de noviembre de 2026
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-medium sm:text-6xl">
            Qué propone cada partido en su programa electoral, explicado{" "}
            <span className="marker">claro</span> y con la fuente a un clic.
          </h1>
          <p className="text-ink-muted mt-5 max-w-2xl text-lg">
            Leemos los programas electorales enteros y los ordenamos por temas. Cada frase enlaza a
            la página exacta del programa oficial, para que lo compruebes tú.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/comparar"
              className="bg-ink text-paper inline-flex min-h-12 items-center justify-center gap-2 rounded-md px-6 text-base font-semibold transition-opacity hover:opacity-90"
            >
              <Columns3 className="h-5 w-5" aria-hidden /> Comparar partidos
            </Link>
            <Link
              href="/partidos"
              className="border-rule-strong hover:bg-paper-raised inline-flex min-h-12 items-center justify-center gap-2 rounded-md border px-6 text-base font-semibold transition-colors"
            >
              Conocer un partido <ArrowRight className="h-5 w-5" aria-hidden />
            </Link>
          </div>
          <p className="border-notice-rule bg-notice-bg text-notice-ink mt-8 inline-flex flex-wrap items-center gap-x-2 rounded-md border px-3 py-2 text-sm">
            <strong className="font-semibold">
              {estado.con29N} de {estado.total} partidos
            </strong>
            han publicado ya su programa del 29N. Mientras tanto, mostramos el de 2023 y lo
            indicamos.
            <Link href="/metodologia#estado" className="font-semibold underline">
              Ver estado
            </Link>
          </p>
          <p className="mt-4 text-sm">
            <Link
              href="/elecciones-generales-2026"
              className="inline-flex min-h-11 items-center gap-1 font-semibold underline-offset-4 hover:underline"
            >
              Guía de las elecciones: fechas, escaños y partidos{" "}
              <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6" aria-labelledby="temas-h">
        <div className="flex items-end justify-between gap-4">
          <h2 id="temas-h" className="text-3xl font-medium">
            Elige un tema
          </h2>
          <Link href="/temas" className="text-sm font-semibold underline-offset-4 hover:underline">
            Todos los temas
          </Link>
        </div>
        <ul className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {ts.map((t) => (
            <li key={t.id}>
              <Link
                href={`/temas/${t.id}`}
                className="group border-rule bg-paper-raised hover:border-rule-strong flex min-h-16 items-center gap-3 rounded-lg border px-4 py-3 transition-colors"
              >
                <TemaIcono
                  icono={t.icono}
                  className="text-ink-muted group-hover:text-ink h-5 w-5 shrink-0"
                />
                <span className="leading-tight font-medium">{t.nombre}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-rule bg-paper-raised border-y" aria-labelledby="partidos-h">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 id="partidos-h" className="text-3xl font-medium">
            Partidos
          </h2>
          <p className="text-ink-muted mt-2">
            {provisional
              ? "Lista provisional (partidos con representación en las Cortes) hasta que el BOE publique las candidaturas oficiales, hacia el 28 de octubre. Orden alfabético."
              : "Todas las candidaturas publicadas en el BOE. Orden alfabético."}
          </p>
          <ul className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {cands.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/partidos/${c.id}`}
                  className="border-rule hover:border-rule-strong flex h-full flex-col gap-2 rounded-lg border px-4 py-3 transition-colors"
                >
                  <Candidato c={c} className="font-semibold" />
                  <ProgramaBadge v={vigente(c)} />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6" aria-labelledby="como-h">
        <h2 id="como-h" className="text-3xl font-medium">
          Cómo funciona
        </h2>
        <ol className="mt-6 grid gap-6 md:grid-cols-3">
          {[
            {
              icon: BookOpenCheck,
              t: "Leemos el programa entero",
              d: "Solo el programa oficial de cada partido. Nada de prensa ni opiniones.",
            },
            {
              icon: Quote,
              t: "Cada frase, con su fuente",
              d: "Pulsa «p. 45» y verás esa página del programa con el texto subrayado.",
            },
            {
              icon: Columns3,
              t: "Tú comparas y decides",
              d: "El mismo trato para todos, en orden alfabético. No recomendamos a quién votar.",
            },
          ].map((s, i) => (
            <li key={i} className="border-rule rounded-lg border p-5">
              <s.icon aria-hidden className="h-6 w-6" strokeWidth={1.75} />
              <h3 className="mt-3 text-xl">{s.t}</h3>
              <p className="text-ink-muted mt-1">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Spec 005, HU-5.2. La portada es estática: el interruptor se lee en el build (ARG) */}
      <SeccionMantenimiento fijos={costesFijos()} activos={process.env.APOYOS_ACTIVOS === "1"} />
    </>
  );
}
