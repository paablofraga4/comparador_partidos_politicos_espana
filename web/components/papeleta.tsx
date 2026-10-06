"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useSyncExternalStore } from "react";

export type CandidaturaPapeleta = {
  id: string;
  corto: string;
  nombre: string;
  color: string;
  listas: Record<string, string>;
  programa: "29N" | "2023" | "pendiente";
};

const KEY = "votoclaro:provincia";
const eventos = new EventTarget();

function subscribe(cb: () => void) {
  eventos.addEventListener("cambio", cb);
  window.addEventListener("storage", cb);
  return () => {
    eventos.removeEventListener("cambio", cb);
    window.removeEventListener("storage", cb);
  };
}
function leer(): string {
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}
function guardar(v: string) {
  try {
    localStorage.setItem(KEY, v);
  } catch {
    /* sin almacenamiento: el valor dura hasta recargar */
  }
  eventos.dispatchEvent(new Event("cambio"));
}

const ETIQUETA = {
  "29N": "Programa del 29N",
  "2023": "Programa de 2023 (anterior)",
  pendiente: "Sin programa publicado",
} as const;

/** «Tu papeleta» (spec 002, HU-2.10): la provincia se guarda solo en este navegador. */
export function Papeleta({
  provincias,
  candidaturas,
}: {
  provincias: { id: string; nombre: string }[];
  candidaturas: CandidaturaPapeleta[];
}) {
  const provincia = useSyncExternalStore(subscribe, leer, () => "");
  const enPapeleta = provincia
    ? candidaturas
        .filter((c) => c.listas[provincia])
        .sort((a, b) => a.corto.localeCompare(b.corto, "es", { sensitivity: "base" }))
    : [];
  const nombreProv = provincias.find((p) => p.id === provincia)?.nombre;

  return (
    <div>
      <label htmlFor="provincia" className="block font-serif text-xl">
        ¿Dónde votas?
      </label>
      <select
        id="provincia"
        value={provincia}
        onChange={(e) => guardar(e.target.value)}
        className="border-rule-strong bg-paper-raised mt-2 min-h-12 w-full max-w-sm rounded-md border px-3 text-base"
      >
        <option value="">Elige tu provincia…</option>
        {provincias.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nombre}
          </option>
        ))}
      </select>
      <p className="text-ink-faint mt-1 text-xs">Solo se guarda en tu navegador.</p>

      {provincia && (
        <section className="mt-8" aria-live="polite">
          <h2 className="text-2xl font-medium">
            Tu papeleta al Congreso en {nombreProv}: {enPapeleta.length} candidaturas
          </h2>
          <p className="text-ink-muted mt-1 text-sm">Orden alfabético. Fuente: BOE.</p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {enPapeleta.map((c) => {
              const local = c.listas[provincia];
              return (
                <li key={c.id}>
                  <Link
                    href={`/partidos/${c.id}`}
                    className="border-rule bg-paper-raised hover:border-rule-strong flex h-full flex-col gap-1 rounded-lg border p-4"
                    style={{ borderLeft: `4px solid ${c.color}` }}
                  >
                    <span className="font-semibold">{c.corto}</span>
                    {local && local !== c.corto && (
                      <span className="text-ink-muted text-sm">En tu papeleta: {local}</span>
                    )}
                    <span className="text-ink-faint text-xs">{ETIQUETA[c.programa]}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
          {enPapeleta.length > 1 && (
            <Link
              href={`/comparar?partidos=${enPapeleta.map((c) => c.id).join(",")}`}
              className="bg-ink text-paper mt-6 inline-flex min-h-12 items-center gap-2 rounded-md px-5 font-semibold"
            >
              Comparar las candidaturas de mi papeleta{" "}
              <ArrowRight aria-hidden className="h-5 w-5" />
            </Link>
          )}
        </section>
      )}
    </div>
  );
}
