/**
 * Interruptor y ajustes de los apoyos (spec 005, HU-5.4, HU-5.5 y HU-5.8). Mismas salvaguardas
 * que los bonos: sin claves de Stripe o sin los datos del titular, no se puede apoyar.
 */
import { estadoPagos, type EstadoPagos } from "../bonos/pagos";

type Env = Record<string, string | undefined>;
export type TipoApoyo = "mensual" | "puntual";
export type Periodo = "total" | "mes";

/** Importes en céntimos (HU-5.4). Los puntuales admiten además otra cantidad. */
export const IMPORTES: Record<TipoApoyo, readonly number[]> = {
  mensual: [200, 500, 1000],
  puntual: [300, 1000, 2500],
};
export const MINIMO_CENT = 200;
/** Tope de una aportación puntual libre: evita errores al teclear (un cero de más). */
export const MAXIMO_CENT = 50000;

export function estadoApoyos(env: Env = process.env): EstadoPagos {
  if (env.APOYOS_ACTIVOS !== "1") return { activos: false, motivo: "apagados" };
  // Independiente del interruptor de los bonos, pero con sus mismas comprobaciones
  return estadoPagos({ ...env, PAGOS_ACTIVOS: "1" });
}

export const esTipo = (t: unknown): t is TipoApoyo => t === "mensual" || t === "puntual";

/** Importe en céntimos a partir de lo que llega del formulario: un importe fijo o «otra». */
export function leerImporte(tipo: TipoApoyo, fijo: string | null, otro: string | null): number | null {
  if (fijo && fijo !== "otro") {
    const c = Number(fijo);
    return IMPORTES[tipo].includes(c) ? c : null;
  }
  if (tipo !== "puntual" || !otro) return null;
  const euros = Number(otro.trim().replace(/\s*€$/, "").replace(",", "."));
  if (!Number.isFinite(euros)) return null;
  const c = Math.round(euros * 100);
  return c >= MINIMO_CENT && c <= MAXIMO_CENT ? c : null;
}

export function periodo(env: Env = process.env): Periodo {
  return env.APOYOS_PERIODO === "mes" ? "mes" : "total";
}

/** Apoyos que el propietario ha ocultado del tablón (ids separados por comas). */
export function ocultos(env: Env = process.env): Set<string> {
  return new Set(
    (env.APOYOS_OCULTOS ?? "")
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

/** Enlace del portal de clientes de Stripe para gestionar o cancelar el apoyo mensual. */
export function urlPortal(env: Env = process.env): string | null {
  const u = env.STRIPE_PORTAL_URL?.trim();
  return u && /^https:\/\//.test(u) ? u : null;
}
