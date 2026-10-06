/**
 * Planes de bonos (spec 004, HU-4.4). Único sitio donde se definen precios y cupos.
 * Estimación: 0,012 €/pregunta (prudente), IVA 21 % incluido, Stripe 1,5 % + 0,25 €.
 */
export type IdPlan = "b25" | "b100" | "b200";

export type Plan = {
  id: IdPlan;
  nombre: string;
  preguntas: number;
  /** Precio final con IVA, en céntimos de euro */
  precioCent: number;
  /** Máximo de preguntas por hora con este bono */
  porHora: number;
};

export const PLANES: readonly Plan[] = [
  { id: "b25", nombre: "Bono 25", preguntas: 25, precioCent: 99, porHora: 10 },
  { id: "b100", nombre: "Bono 100", preguntas: 100, precioCent: 299, porHora: 20 },
  { id: "b200", nombre: "Bono 200", preguntas: 200, precioCent: 499, porHora: 30 },
];

/** Los bonos valen hasta final de año (pago único, sin suscripción). */
export const CADUCIDAD_BONOS = new Date("2026-12-31T23:59:59+01:00");

export function planPorId(id: string): Plan | null {
  return PLANES.find((p) => p.id === id) ?? null;
}

const EUR = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

export function euros(cent: number): string {
  return EUR.format(cent / 100);
}

/** «4», «3», «2,5»: céntimos por pregunta, redondeado a una décima. */
export function centimosPorPregunta(p: Plan): string {
  const c = Math.round((p.precioCent / p.preguntas) * 10) / 10;
  return c.toLocaleString("es-ES", { maximumFractionDigits: 1 });
}

export function fechaCaducidad(d = CADUCIDAD_BONOS): string {
  return d.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Madrid",
  });
}
