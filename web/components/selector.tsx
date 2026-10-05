"use client";

import { Check } from "lucide-react";
import { parseAsArrayOf, parseAsString, useQueryStates } from "nuqs";
import { useTransition } from "react";

import { TemaIcono } from "./piezas";

const seleccionParsers = {
  partidos: parseAsArrayOf(parseAsString).withDefault([]),
  temas: parseAsArrayOf(parseAsString).withDefault([]),
};

type Opcion = { id: string; etiqueta: string; color?: string; icono?: string };

/** Selector de candidaturas y temas (spec 002, HU-2.1). El estado vive en la URL. */
export function Selector({ partidos, temas }: { partidos: Opcion[]; temas: Opcion[] }) {
  const [pending, startTransition] = useTransition();
  const [sel, setSel] = useQueryStates(seleccionParsers, {
    shallow: false,
    history: "replace",
    startTransition,
  });

  const toggle = (key: "partidos" | "temas", id: string) =>
    setSel((s) => ({
      [key]: s[key].includes(id) ? s[key].filter((x) => x !== id) : [...s[key], id],
    }));

  return (
    <div className="space-y-6" aria-busy={pending}>
      <Grupo
        titulo="1. Partidos"
        ayuda="Elige uno para conocerlo o varios para compararlos."
        opciones={partidos}
        seleccion={sel.partidos}
        onToggle={(id) => toggle("partidos", id)}
        onTodos={() => setSel({ partidos: partidos.map((p) => p.id) })}
        onNinguno={() => setSel({ partidos: [] })}
      />
      <Grupo
        titulo="2. Temas"
        ayuda="Elige los temas que te importan."
        opciones={temas}
        seleccion={sel.temas}
        onToggle={(id) => toggle("temas", id)}
        onTodos={() => setSel({ temas: temas.map((t) => t.id) })}
        onNinguno={() => setSel({ temas: [] })}
      />
      <p role="status" aria-live="polite" className="sr-only">
        {sel.partidos.length} partidos y {sel.temas.length} temas seleccionados
      </p>
    </div>
  );
}

function Grupo({
  titulo,
  ayuda,
  opciones,
  seleccion,
  onToggle,
  onTodos,
  onNinguno,
}: {
  titulo: string;
  ayuda: string;
  opciones: Opcion[];
  seleccion: string[];
  onToggle: (id: string) => void;
  onTodos: () => void;
  onNinguno: () => void;
}) {
  return (
    <fieldset>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <legend className="font-serif text-xl">{titulo}</legend>
        <div className="flex gap-3 text-sm">
          <button
            className="min-h-9 underline-offset-4 hover:underline"
            onClick={onTodos}
            type="button"
          >
            Todos
          </button>
          {seleccion.length > 0 && (
            <button
              className="text-ink-muted min-h-9 underline-offset-4 hover:underline"
              onClick={onNinguno}
              type="button"
            >
              Quitar selección
            </button>
          )}
        </div>
      </div>
      <p className="text-ink-muted text-sm">{ayuda}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {opciones.map((o) => {
          const on = seleccion.includes(o.id);
          return (
            <button
              key={o.id}
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(o.id)}
              className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors ${
                on
                  ? "border-ink bg-ink text-paper"
                  : "border-rule bg-paper-raised hover:border-rule-strong"
              }`}
            >
              {o.color && (
                <span
                  aria-hidden
                  className="h-2.5 w-2.5 rounded-full ring-1 ring-black/10"
                  style={{ background: o.color }}
                />
              )}
              {o.icono && <TemaIcono icono={o.icono} className="h-4 w-4" />}
              {o.etiqueta}
              {on && <Check aria-hidden className="h-4 w-4" />}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
