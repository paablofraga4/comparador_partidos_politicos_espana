/**
 * Cupo del chat (spec 004): preguntas gratis por navegador, techo diario por IP y bonos.
 * Toda reserva es atómica (UPDATE … WHERE usadas < total RETURNING) y se puede devolver si la
 * respuesta falla. Nada de lo que se guarda identifica a una persona.
 */
import type { Db } from "../db";
import { claveAnonima } from "../chat/limites";
import { hashCodigo, hashValor, nuevoId, normalizarCodigo } from "./codigos";
import { CADUCIDAD_BONOS, type Plan } from "./planes";

const SECRETO = () => process.env.IP_HASH_SECRET || "votoclaro-desarrollo";
const dia = (d: Date) => d.toISOString().slice(0, 10);
const hora = (d: Date) => d.toISOString().slice(0, 13);

// --- Gratis --------------------------------------------------------------------------------

/** Reserva una pregunta gratis para este navegador. Devuelve las usadas o null si no quedan. */
export async function reservarGratis(
  db: Db,
  cookie: string,
  total: number,
): Promise<number | null> {
  if (total < 1) return null;
  const [fila] = await db.query<{ usadas: number }>(
    `insert into uso_gratis (clave, usadas) values ($1, 1)
     on conflict (clave) do update set usadas = uso_gratis.usadas + 1
       where uso_gratis.usadas < $2
     returning usadas`,
    [hashValor(cookie), total],
  );
  if (Math.random() < 0.01) {
    await db.query("delete from uso_gratis where creado < now() - interval '120 days'");
  }
  return fila ? Number(fila.usadas) : null;
}

export async function devolverGratis(db: Db, cookie: string): Promise<void> {
  await db.query("update uso_gratis set usadas = greatest(usadas - 1, 0) where clave = $1", [
    hashValor(cookie),
  ]);
}

export async function usadasGratis(db: Db, cookie: string | undefined): Promise<number> {
  if (!cookie) return 0;
  const [fila] = await db.query<{ usadas: number }>(
    "select usadas from uso_gratis where clave = $1",
    [hashValor(cookie)],
  );
  return Number(fila?.usadas ?? 0);
}

/** Techo diario por IP del uso gratis (HMAC con sal diaria: borrar cookies no da más). */
export async function reservarIp(db: Db, ip: string, max: number, ahora = new Date()) {
  const [fila] = await db.query<{ contador: number }>(
    `insert into limites (clave, ventana, contador) values ($1, $2, 1)
     on conflict (clave, ventana) do update set contador = limites.contador + 1
       where limites.contador < $3
     returning contador`,
    [claveAnonima(ip, dia(ahora), SECRETO()), `g:${dia(ahora)}`, max],
  );
  if (Math.random() < 0.02) {
    await db.query("delete from limites where creado < now() - interval '2 days'");
  }
  return fila ? Number(fila.contador) : null;
}

export async function devolverIp(db: Db, ip: string, ahora = new Date()): Promise<void> {
  await db.query(
    `update limites set contador = greatest(contador - 1, 0) where clave = $1 and ventana = $2`,
    [claveAnonima(ip, dia(ahora), SECRETO()), `g:${dia(ahora)}`],
  );
}

// --- Bonos ---------------------------------------------------------------------------------

export type Bono = {
  id: string;
  plan: string;
  total: number;
  usadas: number;
  porHora: number;
  estado: "pendiente" | "activo" | "anulado";
  caduca: Date;
};

type FilaBono = {
  id: string;
  plan: string;
  total: number;
  usadas: number;
  por_hora: number;
  estado: Bono["estado"];
  caduca: string | Date;
};

const aBono = (f: FilaBono): Bono => ({
  id: f.id,
  plan: f.plan,
  total: Number(f.total),
  usadas: Number(f.usadas),
  porHora: Number(f.por_hora),
  estado: f.estado,
  caduca: new Date(f.caduca),
});

const COLUMNAS = "id, plan, total, usadas, por_hora, estado, caduca";

export async function crearBonoPendiente(
  db: Db,
  plan: Plan,
  codigo: string,
  caduca = CADUCIDAD_BONOS,
): Promise<string> {
  const id = nuevoId();
  await db.query(
    `insert into bonos (id, codigo_hash, plan, total, por_hora, caduca)
     values ($1, $2, $3, $4, $5, $6)`,
    [id, hashCodigo(codigo), plan.id, plan.preguntas, plan.porHora, caduca.toISOString()],
  );
  return id;
}

export async function vincularSesion(db: Db, bonoId: string, sesion: string): Promise<void> {
  await db.query("update bonos set sesion = $2 where id = $1", [bonoId, sesion]);
}

/** Activa un bono pagado. Idempotente: confirmar y webhook pueden llegar en cualquier orden. */
export async function activarBono(
  db: Db,
  bonoId: string,
  pago: string | null,
): Promise<Bono | null> {
  const [fila] = await db.query<FilaBono>(
    `update bonos set estado = 'activo', activado = coalesce(activado, now()),
       pago = coalesce(pago, $2)
     where id = $1 and estado in ('pendiente', 'activo')
     returning ${COLUMNAS}`,
    [bonoId, pago],
  );
  return fila ? aBono(fila) : null;
}

export async function anularPorPago(db: Db, pago: string): Promise<number> {
  const filas = await db.query<{ id: string }>(
    "update bonos set estado = 'anulado' where pago = $1 returning id",
    [pago],
  );
  return filas.length;
}

export async function bonoPorCodigo(db: Db, entrada: string | undefined): Promise<Bono | null> {
  const codigo = entrada ? normalizarCodigo(entrada) : null;
  if (!codigo) return null;
  const [fila] = await db.query<FilaBono>(`select ${COLUMNAS} from bonos where codigo_hash = $1`, [
    hashCodigo(codigo),
  ]);
  return fila ? aBono(fila) : null;
}

export type MotivoBono = "no-existe" | "pendiente" | "anulado" | "caducado" | "agotado" | "hora";

export type ReservaBono =
  { ok: true; bono: Bono } | { ok: false; motivo: MotivoBono; bono: Bono | null };

/** Reserva una pregunta del bono, respetando su total, su caducidad y su máximo por hora. */
export async function reservarBono(
  db: Db,
  entrada: string,
  ahora = new Date(),
): Promise<ReservaBono> {
  const codigo = normalizarCodigo(entrada);
  if (!codigo) return { ok: false, motivo: "no-existe", bono: null };
  const [fila] = await db.query<FilaBono>(
    `update bonos set usadas = usadas + 1
     where codigo_hash = $1 and estado = 'activo' and usadas < total and caduca > $2
     returning ${COLUMNAS}`,
    [hashCodigo(codigo), ahora.toISOString()],
  );
  if (!fila) {
    const b = await bonoPorCodigo(db, codigo);
    if (!b) return { ok: false, motivo: "no-existe", bono: null };
    const motivo: MotivoBono =
      b.estado !== "activo" ? b.estado : b.caduca <= ahora ? "caducado" : "agotado";
    return { ok: false, motivo, bono: b };
  }
  const bono = aBono(fila);
  const [h] = await db.query<{ contador: number }>(
    `insert into limites (clave, ventana, contador) values ($1, $2, 1)
     on conflict (clave, ventana) do update set contador = limites.contador + 1
       where limites.contador < $3
     returning contador`,
    [`bono:${bono.id}`, `h:${hora(ahora)}`, bono.porHora],
  );
  if (!h) {
    await db.query("update bonos set usadas = greatest(usadas - 1, 0) where id = $1", [bono.id]);
    return { ok: false, motivo: "hora", bono: { ...bono, usadas: bono.usadas - 1 } };
  }
  return { ok: true, bono };
}

export async function devolverBono(db: Db, bonoId: string, ahora = new Date()): Promise<void> {
  await db.query("update bonos set usadas = greatest(usadas - 1, 0) where id = $1", [bonoId]);
  await db.query(
    `update limites set contador = greatest(contador - 1, 0) where clave = $1 and ventana = $2`,
    [`bono:${bonoId}`, `h:${hora(ahora)}`],
  );
}

/** Intentos de canjear un código: máximo `max` por hora y por IP (contra la fuerza bruta). */
export async function intentoCanje(db: Db, ip: string, max = 10, ahora = new Date()) {
  const [fila] = await db.query<{ contador: number }>(
    `insert into limites (clave, ventana, contador) values ($1, $2, 1)
     on conflict (clave, ventana) do update set contador = limites.contador + 1
       where limites.contador < $3
     returning contador`,
    [claveAnonima(ip, dia(ahora), SECRETO()), `c:${hora(ahora)}`, max],
  );
  return !!fila;
}

/** Lo que le queda a un bono que se puede usar (activo y sin caducar), o null. */
export function bonoUsable(b: Bono, ahora = new Date()): boolean {
  return b.estado === "activo" && b.caduca > ahora && b.usadas < b.total;
}
