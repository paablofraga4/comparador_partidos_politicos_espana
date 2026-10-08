/**
 * Cuentas claras (spec 005, HU-5.3): lo que cuesta VotoClaro y lo que entra. Nada inventado:
 * los costes fijos vienen de las facturas (data/costes.yaml), la IA del gasto registrado y las
 * comisiones se rotulan como estimación.
 */
import { planPorId } from "../bonos/planes";
import type { Db } from "../db";

export type CosteFijo = {
  id: string;
  nombre: string;
  euros_mes?: number;
  euros_ano?: number;
  /** Fecha de la factura o de la última comprobación (AAAA-MM-DD) */
  actualizado: string;
};

/** Cambio de referencia del BCE: cuántos dólares vale un euro, y de qué día. */
export type Cambio = { usdPorEur: number; fecha: string; fuente: string };

export const usdACent = (usd: number, c: Cambio) => Math.round((usd / c.usdPorEur) * 100);

/** Comisión de Stripe para tarjetas europeas: 1,5 % + 0,25 € por cobro. */
export const COMISION = { porcentaje: 0.015, fijoCent: 25 };

/** Coste mensual de una partida fija, en céntimos (las anuales se prorratean). */
export function centMensual(c: CosteFijo): number | null {
  if (typeof c.euros_mes === "number") return Math.round(c.euros_mes * 100);
  if (typeof c.euros_ano === "number") return Math.round((c.euros_ano * 100) / 12);
  return null;
}

export function fijosMensualCent(fijos: CosteFijo[]): number {
  return fijos.reduce((s, c) => s + (centMensual(c) ?? 0), 0);
}

export function comisionEstimadaCent(totalCent: number, cobros: number): number {
  return Math.round(totalCent * COMISION.porcentaje) + COMISION.fijoCent * cobros;
}

/** «AAAA-MM-DD» y «AAAA-MM» de hoy en la hora de España. */
export function hoyEnEspana(ahora = new Date()): { dia: string; mes: string } {
  const dia = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(ahora);
  return { dia, mes: dia.slice(0, 7) };
}

/** Meses completos entre el mes de inicio y el actual («2026-10» → «2026-12» = 2). */
export function mesesEntre(inicio: string, actual: string): number {
  const [ai, mi] = inicio.split("-").map(Number);
  const [aa, ma] = actual.split("-").map(Number);
  if (!ai || !mi || !aa || !ma) return 0;
  return Math.max(0, (aa - ai) * 12 + (ma - mi));
}

/**
 * Cobertura del mes (spec 005, HU-5.3): lo que entra este mes frente a lo que cuesta este mes,
 * más lo que falta por cubrir de la carga de los programas, que se paga una vez. Lo que sobró en
 * meses anteriores (ingresos menos costes) se descuenta de la carga.
 */
export function cobertura(a: {
  costesMesCent: number;
  cargaCent: number;
  ingresosMesCent: number;
  saldoAnteriorCent: number;
}): { metaCent: number; cargaPendienteCent: number; pct: number } {
  const cargaPendienteCent = Math.max(0, a.cargaCent - Math.max(0, a.saldoAnteriorCent));
  const metaCent = a.costesMesCent + cargaPendienteCent;
  const pct = metaCent > 0 ? Math.min(100, Math.floor((a.ingresosMesCent / metaCent) * 100)) : 100;
  return { metaCent, cargaPendienteCent, pct };
}

/** Gasto de la IA del chat desde un día («AAAA-MM-DD»), o en total, en dólares. */
export async function iaDesdeUsd(db: Db, dia: string | null): Promise<number> {
  const [f] = await db.query<{ usd: string | number | null }>(
    "select coalesce(sum(coste_usd), 0) as usd from uso_diario where ($1::date is null or fecha >= $1::date)",
    [dia],
  );
  return Number(f?.usd ?? 0);
}

/** Lo cobrado en apoyos (sin devoluciones) desde una fecha, o en total, con su número de cobros. */
export async function ingresosApoyos(
  db: Db,
  desde: Date | null,
): Promise<{ cent: number; cobros: number }> {
  const [f] = await db.query<{ cent: number; cobros: number }>(
    `select coalesce(sum(importe_cent), 0)::int as cent, count(*)::int as cobros from apoyo_cobros
     where not devuelto and ($1::timestamptz is null or cobrado >= $1::timestamptz)`,
    [desde?.toISOString() ?? null],
  );
  return { cent: Number(f?.cent ?? 0), cobros: Number(f?.cobros ?? 0) };
}

/** Gasto de la IA del chat en los últimos 30 días, en dólares (OpenAI factura en dólares). */
export async function iaUltimos30Usd(db: Db): Promise<number> {
  const [f] = await db.query<{ usd: string | number | null }>(
    "select coalesce(sum(coste_usd), 0) as usd from uso_diario where fecha > current_date - 30",
  );
  return Number(f?.usd ?? 0);
}

/** Lo ingresado por bonos del chat (activos, no devueltos), con su número de cobros. */
export async function ingresosBonos(
  db: Db,
  desde: Date | null,
): Promise<{ cent: number; cobros: number }> {
  const filas = await db.query<{ plan: string; n: number }>(
    `select plan, count(*)::int as n from bonos
     where estado = 'activo' and ($1::timestamptz is null or activado >= $1::timestamptz)
     group by plan`,
    [desde?.toISOString() ?? null],
  );
  return filas.reduce(
    (s, f) => ({
      cent: s.cent + (planPorId(f.plan)?.precioCent ?? 0) * Number(f.n),
      cobros: s.cobros + Number(f.n),
    }),
    { cent: 0, cobros: 0 },
  );
}
