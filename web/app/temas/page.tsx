import type { Metadata } from "next";
import Link from "next/link";

import { TemaIcono } from "@/components/piezas";
import { temas } from "@/lib/data";

export const metadata: Metadata = {
  title: "Temas",
  description: "Los 19 temas en los que comparamos los programas electorales del 29N.",
};

export default function Temas() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="text-4xl font-medium sm:text-5xl">Temas</h1>
      <p className="text-ink-muted mt-3 max-w-2xl text-lg">
        Los mismos 19 temas para todos los partidos. Dentro de cada uno verás qué propone cada
        partido y si no lo menciona.
      </p>
      <ul className="mt-8 grid gap-3 sm:grid-cols-2">
        {temas().map((t) => (
          <li key={t.id}>
            <Link
              href={`/temas/${t.id}`}
              className="border-rule bg-paper-raised hover:border-rule-strong flex h-full gap-4 rounded-lg border p-4 transition-colors"
            >
              <TemaIcono icono={t.icono} className="text-ink-muted mt-1 h-6 w-6 shrink-0" />
              <span>
                <span className="block font-serif text-xl">{t.nombre}</span>
                <span className="text-ink-muted mt-1 block text-sm">{t.descripcion}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
