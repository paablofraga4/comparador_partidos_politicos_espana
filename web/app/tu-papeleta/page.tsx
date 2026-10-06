import type { Metadata } from "next";
import Link from "next/link";

import { Papeleta, type CandidaturaPapeleta } from "@/components/papeleta";
import { candidaturas, circunscripciones, registro, vigente } from "@/lib/data";
import { metaPagina } from "@/lib/seo";

export const metadata: Metadata = metaPagina({
  titulo: "Tu papeleta",
  descripcion:
    "Elige tu provincia y mira qué candidaturas al Congreso hay en tu papeleta el 29N, con sus programas.",
  ruta: "/tu-papeleta",
});

export default function TuPapeleta() {
  const fase = registro().fase_inclusion;
  const provincias = circunscripciones();
  const lista: CandidaturaPapeleta[] = candidaturas().map((c) => {
    const v = vigente(c);
    return {
      id: c.id,
      corto: c.corto,
      nombre: c.nombre,
      color: c.color,
      listas: c.convocatorias["generales-2026"]?.listas ?? {},
      programa: v.tipo === "pendiente" ? "pendiente" : v.anterior ? "2023" : "29N",
    };
  });

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
          <Papeleta provincias={provincias} candidaturas={lista} />
        )}
      </div>
    </div>
  );
}
