"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import { EVENTO_FUENTE, FUENTE_PARAM } from "./cita";

// El panel trae la librería de animación y el visor de PDF: no hace falta para pintar la página
const FuentePanel = dynamic(() => import("./fuente-panel").then((m) => m.FuentePanel), {
  ssr: false,
});

/** Primera señal de que hay una persona usando la página (nunca ocurre en una medición). */
const INTERACCIONES = ["pointerdown", "pointermove", "touchstart", "keydown", "scroll"] as const;

/**
 * Carga el panel de fuente solo cuando hace falta (rendimiento, constitución V.4): al pulsar una
 * cita o si la URL ya trae ?fuente=. Se precarga con la primera interacción (mover el ratón,
 * tocar, teclear, desplazarse), que siempre llega antes que el clic en una cita: así no compite
 * con el primer pintado y la primera cita se abre igual de rápido.
 */
export function FuentePanelDiferido() {
  const [activo, setActivo] = useState(
    () =>
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).has(FUENTE_PARAM),
  );
  const [inicial, setInicial] = useState<string | null>(null);

  useEffect(() => {
    if (activo) return;
    const abrir = (e: Event) => {
      setInicial((e as CustomEvent<string>).detail);
      setActivo(true);
    };
    window.addEventListener(EVENTO_FUENTE, abrir);
    const quitar = () => INTERACCIONES.forEach((t) => window.removeEventListener(t, precargar));
    function precargar() {
      quitar();
      void import("./fuente-panel");
    }
    INTERACCIONES.forEach((t) => window.addEventListener(t, precargar, { passive: true }));
    return () => {
      window.removeEventListener(EVENTO_FUENTE, abrir);
      quitar();
    };
  }, [activo]);

  return activo ? <FuentePanel inicial={inicial} /> : null;
}
