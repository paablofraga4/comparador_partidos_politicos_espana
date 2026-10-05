import type { Metadata } from "next";
import Link from "next/link";

import { Candidato, ProgramaBadge } from "@/components/piezas";
import { candidaturas, registro, vigente } from "@/lib/data";

export const metadata: Metadata = {
  title: "Partidos",
  description: "Los partidos que se presentan a las elecciones generales del 29N y sus programas.",
};

export default function Partidos() {
  const provisional = registro().fase_inclusion === "provisional";
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="text-4xl font-medium sm:text-5xl">Partidos</h1>
      <p className="text-ink-muted mt-3 max-w-2xl text-lg">
        Elige un partido para ver todo lo que propone, tema a tema.
      </p>
      {provisional && (
        <p className="border-rule text-ink-muted mt-4 max-w-2xl rounded-md border p-3 text-sm">
          <strong className="text-ink">Lista provisional.</strong> Incluye a los partidos con
          representación en las Cortes. Cuando el BOE publique las candidaturas oficiales (hacia el
          28 de octubre) aparecerán todas, sin excepción.{" "}
          <Link href="/metodologia#criterio" className="underline">
            Ver criterio
          </Link>
        </p>
      )}
      <ul className="mt-8 grid gap-3 sm:grid-cols-2">
        {candidaturas().map((c) => (
          <li key={c.id}>
            <Link
              href={`/partidos/${c.id}`}
              className="border-rule bg-paper-raised hover:border-rule-strong flex h-full flex-col gap-2 rounded-lg border p-4 transition-colors"
              style={{ borderLeft: `4px solid ${c.color}` }}
            >
              <Candidato c={c} className="font-serif text-xl" />
              <span className="text-ink-muted text-sm">{c.nombre}</span>
              <ProgramaBadge v={vigente(c)} />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
