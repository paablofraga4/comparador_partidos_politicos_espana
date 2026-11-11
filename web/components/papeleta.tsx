"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";

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

/** Recuerda la provincia de la página que se visita, solo en este navegador (spec 002, HU-2.10). */
export function RecordarProvincia({ id }: { id: string }) {
  useEffect(() => guardar(id), [id]);
  return null;
}

/**
 * «Tu papeleta» (spec 002, HU-2.10; spec 006, HU-6.2): elegir la provincia lleva a su página. La
 * provincia se guarda solo en este navegador y nunca sale de él.
 */
export function Papeleta({
  provincias,
  compacta = false,
}: {
  provincias: { id: string; nombre: string }[];
  /** Dentro de una tarjeta (portada, spec 007): etiqueta pequeña y enlace sin botón grande */
  compacta?: boolean;
}) {
  const router = useRouter();
  const provincia = useSyncExternalStore(subscribe, leer, () => "");
  const recordada = provincias.find((p) => p.id === provincia);
  const id = compacta ? "provincia-portada" : "provincia";

  return (
    <div className={compacta ? "mt-auto" : undefined}>
      <label
        htmlFor={id}
        className={compacta ? "block text-sm font-semibold" : "block font-serif text-xl"}
      >
        ¿Dónde votas?
      </label>
      <select
        id={id}
        value=""
        onChange={(e) => {
          if (!e.target.value) return;
          guardar(e.target.value);
          router.push(`/tu-papeleta/${e.target.value}`);
        }}
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
      {recordada && (
        <Link
          href={`/tu-papeleta/${recordada.id}`}
          className={
            compacta
              ? "mt-2 inline-flex min-h-11 items-center gap-1 text-sm font-semibold"
              : "bg-ink text-paper mt-5 inline-flex min-h-12 items-center gap-2 rounded-md px-5 font-semibold"
          }
        >
          Ver mi papeleta en {recordada.nombre} <ArrowRight aria-hidden className="h-5 w-5" />
        </Link>
      )}
    </div>
  );
}
