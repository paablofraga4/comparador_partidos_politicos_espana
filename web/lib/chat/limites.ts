/**
 * Uso justo y control de gasto del chat (spec 003, HU-3.7 y HU-3.8).
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

export async function contarYComprobar(
  db: Db,
  ip: string,
  ahora = new Date(),
): Promise<{ ok: true } | { ok: false; mensaje: string }> {
  const iso = ahora.toISOString();
  const dia = iso.slice(0, 10);
  const hora = iso.slice(0, 13);
  const clave = claveAnonima(ip, dia, process.env.IP_HASH_SECRET || "votoclaro-desarrollo");
  const filas = await db.query<{ ventana: string; contador: number }>(
    `insert into limites (clave, ventana, contador) values ($1, $2, 1), ($1, $3, 1)
     on conflict (clave, ventana) do update set contador = limites.contador + 1
     returning ventana, contador`,
    [clave, `h:${hora}`, `d:${dia}`],
  );
  if (Math.random() < 0.02) {
    await db.query("delete from limites where creado < now() - interval '2 days'");
  }
  const porHora = numeroEnv("CHAT_RATE_LIMIT_PER_HOUR", 15);
  const porDia = numeroEnv("CHAT_RATE_LIMIT_PER_DAY", 40);
  const h = filas.find((f) => f.ventana.startsWith("h:"))?.contador ?? 0;
  const d = filas.find((f) => f.ventana.startsWith("d:"))?.contador ?? 0;
  if (d > porDia) {
    return {
      ok: false,
      mensaje: `Has llegado al máximo de ${porDia} preguntas por hoy. Mañana podrás seguir preguntando. Mientras tanto, el comparador sigue disponible.`,
    };
  }
  if (h > porHora) {
    return {
      ok: false,
      mensaje: `Has hecho muchas preguntas seguidas (el máximo es ${porHora} por hora). Vuelve a intentarlo en un rato; el comparador sigue disponible.`,
    };
  }
  return { ok: true };
}

export async function presupuestoAgotado(db: Db): Promise<boolean> {
  const tope = numeroEnv("CHAT_DAILY_BUDGET_USD", 1.5);
  const [fila] = await db.query<{ coste_usd: string | number }>(
    "select coste_usd from uso_diario where fecha = current_date",
  );
  return Number(fila?.coste_usd ?? 0) >= tope;
}

export async function registrarUso(db: Db, uso: Uso): Promise<number> {
  const coste = costeUsd(uso, precio("CHAT"));
  await db.query(
    `insert into uso_diario (fecha, preguntas, tokens_entrada, tokens_salida, coste_usd)
     values (current_date, 1, $1, $2, $3)
     on conflict (fecha) do update set preguntas = uso_diario.preguntas + 1,
       tokens_entrada = uso_diario.tokens_entrada + $1,
       tokens_salida = uso_diario.tokens_salida + $2,
       coste_usd = uso_diario.coste_usd + $3`,
    [uso.entrada, uso.salida, coste],
  );
  return coste;
}
