/**
 * Registro de apoyos y cobros (spec 005, HU-5.4 y HU-5.7). Todo es idempotente: la vuelta del
 * pago y el webhook pueden llegar en cualquier orden, y Stripe reintenta los avisos.
 */
import { nuevoId } from "../bonos/codigos";
import type { Db } from "../db";
import type { TipoApoyo } from "./config";

export type Apoyo = {
  id: string;
  tipo: TipoApoyo;
  importeCent: number;
  nombre: string | null;
  estado: "pendiente" | "activo" | "cancelado";
  activado: Date | null;
};

type FilaApoyo = {
  id: string;
  tipo: TipoApoyo;
  importe_cent: number;
  nombre: string | null;
  estado: Apoyo["estado"];
  activado: string | Date | null;
};

const aApoyo = (f: FilaApoyo): Apoyo => ({
  id: f.id,
  tipo: f.tipo,
  importeCent: Number(f.importe_cent),
  nombre: f.nombre,
  estado: f.estado,
  activado: f.activado ? new Date(f.activado) : null,
});

/** Crea el apoyo antes de abrir el pago. El prefijo ayuda a reconocerlo en los metadatos de Stripe. */
export async function crearApoyoPendiente(
  db: Db,
  tipo: TipoApoyo,
  importeCent: number,
): Promise<string> {
  const id = `ap_${nuevoId(12)}`;
  await db.query("insert into apoyos (id, tipo, importe_cent) values ($1, $2, $3)", [
    id,
    tipo,
    importeCent,
  ]);
  if (Math.random() < 0.02) {
    // Pagos abandonados: nunca llegaron a cobrarse
    await db.query(
      `delete from apoyos a where a.estado = 'pendiente' and a.creado < now() - interval '2 days'
         and not exists (select 1 from apoyo_cobros c where c.apoyo = a.id)`,
    );
  }
  return id;
}

export async function vincularSesionApoyo(db: Db, id: string, sesion: string): Promise<void> {
  await db.query("update apoyos set sesion = $2 where id = $1", [id, sesion]);
}

/** Activa un apoyo pagado y guarda su nombre (ya filtrado) si es la primera vez que llega. */
export async function activarApoyo(db: Db, id: string, nombre: string | null): Promise<Apoyo | null> {
  const [f] = await db.query<FilaApoyo>(
    `update apoyos set
       estado = case when estado = 'pendiente' then 'activo' else estado end,
       activado = coalesce(activado, now()),
       nombre = coalesce(nombre, $2)
     where id = $1
     returning id, tipo, importe_cent, nombre, estado, activado`,
    [id, nombre],
  );
  return f ? aApoyo(f) : null;
}

export async function leerApoyo(db: Db, id: string): Promise<Apoyo | null> {
  const [f] = await db.query<FilaApoyo>(
    "select id, tipo, importe_cent, nombre, estado, activado from apoyos where id = $1",
    [id],
  );
  return f ? aApoyo(f) : null;
}

/**
 * Registra un cobro (la factura de un mes o el pago único). Si ya estaba, solo completa el
 * PaymentIntent que faltase; un cobro devuelto sigue devuelto. Devuelve false si el apoyo no existe.
 */
export async function registrarCobro(
  db: Db,
  c: { id: string; apoyoId: string; importeCent: number; pago: string | null; cobrado?: Date },
): Promise<boolean> {
  const filas = await db.query(
    `insert into apoyo_cobros (id, apoyo, importe_cent, pago, cobrado)
       select $1, a.id, $3, $4, coalesce($5::timestamptz, now()) from apoyos a where a.id = $2
     on conflict (id) do update set pago = coalesce(apoyo_cobros.pago, excluded.pago)
     returning id`,
    [c.id, c.apoyoId, c.importeCent, c.pago, c.cobrado?.toISOString() ?? null],
  );
  if (!filas.length) return false;
  await db.query(
    `update apoyos set estado = 'activo', activado = coalesce(activado, now())
     where id = $1 and estado = 'pendiente'`,
    [c.apoyoId],
  );
  return true;
}

/** Fin de un apoyo mensual: deja de contar como «cada mes», pero lo ya cobrado sigue contando. */
export async function cancelarApoyo(db: Db, id: string): Promise<void> {
  await db.query("update apoyos set estado = 'cancelado' where id = $1 and tipo = 'mensual'", [id]);
}

/** Devolución completa de un pago: ese cobro sale del tablón y de los totales. */
export async function devolverCobroPorPago(db: Db, pago: string): Promise<number> {
  const filas = await db.query("update apoyo_cobros set devuelto = true where pago = $1 returning id", [
    pago,
  ]);
  return filas.length;
}
