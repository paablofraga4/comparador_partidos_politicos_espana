import { ArrowRight, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { MigasJsonLd } from "@/components/json-ld";
import { Candidato, ProgramaBadge, TemaIcono } from "@/components/piezas";
import { candidaturas, registro, temas, vigente } from "@/lib/data";
import { CALENDARIO, DECRETO, DIPUTADOS, TOTAL_DIPUTADOS } from "@/lib/elecciones";
import { metaPagina } from "@/lib/seo";

export const metadata: Metadata = metaPagina({
  titulo: "Elecciones generales del 29 de noviembre de 2026: fechas, partidos y programas",
  descripcion:
    "Cuándo se vota, el calendario oficial, cuántos diputados elige cada provincia, qué partidos se presentan y dónde leer sus programas electorales.",
  ruta: "/elecciones-generales-2026",
});

/** Guía de las generales del 29N (spec 002, HU-2.12). Cada dato cita el decreto o la LOREG. */
export default function GuiaElecciones() {
  const cands = candidaturas();
  const provisional = registro().fase_inclusion === "provisional";
  const enlaceDecreto = (
    <a href={DECRETO.url} target="_blank" rel="noreferrer" className="underline">
      {DECRETO.corto}
    </a>
  );

  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <MigasJsonLd
        migas={[{ nombre: "Elecciones generales 2026", ruta: "/elecciones-generales-2026" }]}
      />
      <p className="text-ink-muted text-sm font-semibold tracking-wide uppercase">Guía</p>
      <h1 className="mt-2 text-4xl font-medium sm:text-5xl">
        Elecciones generales del 29 de noviembre de 2026
      </h1>
      <p className="text-ink-muted mt-4 text-lg leading-relaxed">
        El domingo 29 de noviembre de 2026 se eligen el Congreso de los Diputados y el Senado. Aquí
        tienes las fechas clave, cómo se reparten los escaños y dónde leer qué propone cada partido
        en su programa electoral.
      </p>
      <p className="text-ink-faint mt-3 text-sm">
        Fuente: {DECRETO.nombre} (BOE de {DECRETO.publicado},{" "}
        <a href={DECRETO.url} target="_blank" rel="noreferrer" className="underline">
          {DECRETO.boe}
        </a>
        ), y los plazos de la Ley Orgánica del Régimen Electoral General (LOREG).
      </p>

      <section className="mt-10" aria-labelledby="fechas">
        <h2 id="fechas" className="text-2xl font-medium">
          Fechas clave
        </h2>
        <ol className="border-rule mt-4 space-y-4 border-l-2 pl-5">
          {CALENDARIO.map((h) => (
            <li key={h.fecha}>
              <p className="tabular font-semibold">{h.fecha}</p>
              <p>
                {h.hito}{" "}
                <span className="text-ink-faint text-sm">
                  · {h.fuente === "decreto" ? DECRETO.corto : "LOREG"}
                </span>
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-12 space-y-3 leading-relaxed" aria-labelledby="escanos">
        <h2 id="escanos" className="text-2xl font-medium">
          Qué se elige
        </h2>
        <p>
          <strong>Congreso:</strong> {TOTAL_DIPUTADOS} diputados, repartidos en {DIPUTADOS.length}{" "}
          circunscripciones: las 50 provincias, Ceuta y Melilla ({enlaceDecreto}, anexo).
        </p>
        <p>
          <strong>Senado:</strong> cuatro senadores en cada circunscripción provincial. En las
          circunscripciones insulares, tres en Gran Canaria, Mallorca y Tenerife, y uno en Ibiza,
          Formentera, Menorca, Fuerteventura, La Gomera, El Hierro, Lanzarote y La Palma. Ceuta y
          Melilla eligen dos cada una ({enlaceDecreto}, art. 3).
        </p>
        <details className="border-rule bg-paper-raised rounded-lg border p-4">
          <summary className="min-h-11 cursor-pointer font-semibold">
            Diputados que elige cada circunscripción
          </summary>
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="border-rule border-b text-left">
                <th scope="col" className="py-2">
                  Circunscripción
                </th>
                <th scope="col" className="py-2 text-right">
                  Diputados
                </th>
              </tr>
            </thead>
            <tbody>
              {DIPUTADOS.map(([nombre, n]) => (
                <tr key={nombre} className="border-rule border-b last:border-0">
                  <td className="py-1.5">{nombre}</td>
                  <td className="tabular py-1.5 text-right">{n}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </section>

      <section className="mt-12 space-y-3" aria-labelledby="partidos">
        <h2 id="partidos" className="text-2xl font-medium">
          Qué partidos se presentan
        </h2>
        <p className="leading-relaxed">
          La lista oficial la publica el Boletín Oficial del Estado: las candidaturas presentadas,
          hacia el 28 de octubre, y las proclamadas, el 2 y 3 de noviembre.{" "}
          {provisional
            ? "Hasta entonces mostramos, de forma provisional, las candidaturas con representación en las Cortes en la XV legislatura, en orden alfabético:"
            : "Estas son las candidaturas, en orden alfabético:"}
        </p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {cands.map((c) => (
            <li key={c.id}>
              <Link
                href={`/partidos/${c.id}`}
                className="border-rule bg-paper-raised hover:border-rule-strong flex h-full flex-col gap-1 rounded-lg border p-3"
              >
                <span className="font-semibold">
                  <Candidato c={c} />
                </span>
                <span className="text-ink-muted text-sm">{c.nombre}</span>
                <ProgramaBadge v={vigente(c)} />
              </Link>
            </li>
          ))}
        </ul>
        <p className="text-ink-muted text-sm">
          <Link href="/metodologia#criterio" className="underline">
            Cómo decidimos qué partidos aparecen
          </Link>
          .
        </p>
      </section>

      <section className="mt-12 space-y-3 leading-relaxed" aria-labelledby="programas">
        <h2 id="programas" className="text-2xl font-medium">
          Dónde leer los programas electorales
        </h2>
        <p>
          Cada partido publica su programa en su web. Mientras no publica el del 29N, aquí verás el
          de las generales de 2023, siempre avisado. Puedes leer cada programa completo, con
          buscador, desde la ficha de cada partido, o ver qué propone cada uno tema a tema:
        </p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {temas().map((t) => (
            <li key={t.id}>
              <Link
                href={`/temas/${t.id}`}
                className="border-rule hover:border-rule-strong bg-paper-raised inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3 text-sm"
              >
                <TemaIcono icono={t.icono} className="h-4 w-4" /> {t.nombre}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-rule mt-12 space-y-3 border-t pt-8" aria-labelledby="como">
        <h2 id="como" className="text-2xl font-medium">
          Cómo te ayuda VotoClaro
        </h2>
        <ul className="list-disc space-y-1 pl-6">
          <li>Comparas las propuestas de varios partidos en el mismo tema, una al lado de otra.</li>
          <li>
            Cada frase enlaza a la página exacta del programa oficial, con el texto resaltado.
          </li>
          <li>Hay una versión en lectura fácil de todo el contenido.</li>
          <li>Puedes preguntar en lenguaje natural; la respuesta cita cada programa.</li>
        </ul>
        <p className="text-ink-muted text-sm">
          Sin opiniones, sin recomendaciones de voto y con todos los partidos en orden alfabético.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/comparar"
            className="bg-ink text-paper inline-flex min-h-12 items-center justify-center gap-2 rounded-md px-6 font-semibold"
          >
            Comparar programas <ArrowRight aria-hidden className="h-5 w-5" />
          </Link>
          <a
            href={DECRETO.url}
            target="_blank"
            rel="noreferrer"
            className="border-rule-strong hover:bg-paper-raised inline-flex min-h-12 items-center justify-center gap-2 rounded-md border px-6 font-semibold"
          >
            Leer el decreto en el BOE <ExternalLink aria-hidden className="h-4 w-4" />
          </a>
        </div>
      </section>
    </article>
  );
}
