/**
 * Control de gasto del chat (spec 003, HU-3.7 y HU-3.8; cupo por persona en spec 004).
 * Nunca se guarda la IP ni el texto: solo un HMAC de la IP con sal diaria y contadores.
 */
import { createHmac } from "node:crypto";

import { numeroEnv, precio } from "../config";
import type { Db } from "../db";

export type Uso = { entrada: number; cache: number; salida: number };

export function claveAnonima(ip: string, dia: string, secreto: string): string {
  return createHmac("sha256", secreto).update(`${dia}|${ip}`).digest("hex").slice(0, 32);
}

export function costeUsd(uso: Uso, p: [number, number, number] | null): number {
  if (!p) return 0;
  const sinCache = Math.max(uso.entrada - uso.cache, 0);
  return (sinCache * p[0] + uso.cache * p[1] + uso.salida * p[2]) / 1_000_000;
}

/** Gasto diario separado (spec 004, HU-4.9): el gratis tiene su tope; el de pago, uno de
 * emergencia (lo pagado se sirve salvo avería). */
export type TipoUso = "gratis" | "pago";

export function topeDiario(tipo: TipoUso): number {
  return tipo === "gratis"
    ? numeroEnv("CHAT_DAILY_BUDGET_USD", 1.5)
    : numeroEnv("CHAT_DAILY_BUDGET_PAGO_USD", 25);
}

export async function presupuestoAgotado(db: Db, tipo: TipoUso): Promise<boolean> {
  const [fila] = await db.query<{ coste_usd: string | number }>(
    "select coste_usd from uso_diario where fecha = current_date and tipo = $1",
    [tipo],
  );
  return Number(fila?.coste_usd ?? 0) >= topeDiario(tipo);
}

export async function registrarUso(db: Db, uso: Uso, tipo: TipoUso): Promise<number> {
  const coste = costeUsd(uso, precio("CHAT"));
  await db.query(
    `insert into uso_diario (fecha, tipo, preguntas, tokens_entrada, tokens_salida, coste_usd)
     values (current_date, $4, 1, $1, $2, $3)
     on conflict (fecha, tipo) do update set preguntas = uso_diario.preguntas + 1,
       tokens_entrada = uso_diario.tokens_entrada + $1,
       tokens_salida = uso_diario.tokens_salida + $2,
       coste_usd = uso_diario.coste_usd + $3`,
    [uso.entrada, uso.salida, coste, tipo],
  );
  return coste;
}
