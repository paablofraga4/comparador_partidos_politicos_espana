"use client";

import { useSyncExternalStore } from "react";

const KEY = "votoclaro:lectura";

/** Se ejecuta en <head> antes de pintar: aplica el modo guardado sin parpadeo. */
export const LECTURA_SCRIPT = `try{if(localStorage.getItem("${KEY}")==="facil")document.documentElement.dataset.lectura="facil"}catch(e){}`;

// El estado vive en <html data-lectura>: se lee como «almacén externo».
function subscribe(cb: () => void) {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-lectura"] });
  return () => obs.disconnect();
}
const getSnapshot = () => document.documentElement.dataset.lectura === "facil";
const getServerSnapshot = () => false;

/**
 * Interruptor global de lectura fácil (spec 002, HU-2.5). El contenido se renderiza en las dos
 * versiones y el CSS muestra una u otra según html[data-lectura], así funciona sin JS de datos.
 */
export function LecturaFacilToggle() {
  const on = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function toggle() {
    const next = !on;
    if (next) document.documentElement.dataset.lectura = "facil";
    else delete document.documentElement.dataset.lectura;
    try {
      localStorage.setItem(KEY, next ? "facil" : "normal");
    } catch {
      /* navegación privada: el modo dura hasta recargar */
    }
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={toggle}
      className="group border-rule hover:border-rule-strong inline-flex min-h-11 items-center gap-2 rounded-full border px-3 text-sm font-medium transition-colors"
    >
      <span
        aria-hidden
        className={`relative inline-block h-5 w-9 shrink-0 rounded-full transition-colors ${on ? "bg-ink" : "bg-rule-strong"}`}
      >
        <span
          className={`bg-paper-raised absolute top-0.5 left-0 h-4 w-4 rounded-full shadow transition-transform ${on ? "translate-x-4.5" : "translate-x-0.5"}`}
        />
      </span>
      Lectura fácil
    </button>
  );
}
