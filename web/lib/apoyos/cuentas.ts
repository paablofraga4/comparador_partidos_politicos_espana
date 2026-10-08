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
