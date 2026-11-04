import type { Metadata } from "next";
import Link from "next/link";

import { Papeleta } from "@/components/papeleta";
import { circunscripciones, registro } from "@/lib/data";
import { metaPagina } from "@/lib/seo";

export const metadata: Metadata = metaPagina({
  titulo: "Tu papeleta del 29N: candidaturas por provincia",
  descripcion:
    "Elige tu provincia y mira qué candidaturas al Congreso hay en tu papeleta el 29N, con sus programas.",
  ruta: "/tu-papeleta",
});

export default function TuPapeleta() {
  const fase = registro().fase_inclusion;
  const provincias = circunscripciones();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="text-4xl font-medium sm:text-5xl">Tu papeleta</h1>
      <p className="text-ink-muted mt-3 max-w-2xl text-lg">
        En cada provincia se vota a candidaturas distintas. Aquí ves las de la tuya, según el
        Boletín Oficial del Estado.
      </p>
      <div className="mt-8">
        {fase === "provisional" || provincias.length === 0 ? (
          <p className="border-rule bg-paper-raised max-w-2xl rounded-lg border p-5">
            Las candidaturas oficiales se publicarán en el BOE hacia el{" "}
            <strong>28 de octubre</strong> (y las definitivas, hacia el 3 de noviembre). Entonces
            podrás elegir tu provincia. Mientras tanto, puedes{" "}
            <Link className="underline" href="/partidos">
              ver los partidos con representación en las Cortes
            </Link>
            .
          </p>
        ) : (
          <>
            <Papeleta provincias={provincias} />
            <section className="mt-12" aria-labelledby="provincias-h">
              <h2 id="provincias-h" className="text-2xl font-medium">
                Todas las circunscripciones
              </h2>
              <ul className="mt-4 grid grid-cols-2 gap-x-4 sm:grid-cols-3">
                {provincias.map((p) => (
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
          </>
        )}
      </div>
    </div>
  );
}
