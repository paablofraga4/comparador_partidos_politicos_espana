import "server-only";

/**
 * Lo que hace la web con cada pago de un apoyo (spec 005, HU-5.4 a HU-5.7). Lo usan la vuelta
 * del pago y el webhook, en cualquier orden y tantas veces como lleguen.
 */
import { nombresDePartidos } from "../data";
import type { Db } from "../db";
import { nombreParaTablon } from "./nombres";
import type { Cobro, EventoApoyo } from "./pasarela";
import { activarApoyo, cancelarApoyo, registrarCobro, type Apoyo } from "./registro";

/** «publico»: sale con su nombre · «anonimo»: no dio nombre · «filtrado»: no pasó el filtro. */
export type EstadoNombre = "publico" | "anonimo" | "filtrado";

export async function anotarPago(
  db: Db,
  a: { apoyoId: string; nombre: string | null; cobro: Cobro | null },
): Promise<{ apoyo: Apoyo; nombre: EstadoNombre } | null> {
  const limpio = nombreParaTablon(a.nombre, nombresDePartidos());
  const apoyo = await activarApoyo(db, a.apoyoId, limpio);
  if (!apoyo) return null;
  if (a.cobro) await registrarCobro(db, { ...a.cobro, apoyoId: a.apoyoId });
  const nombre: EstadoNombre = apoyo.nombre ? "publico" : a.nombre?.trim() ? "filtrado" : "anonimo";
  return { apoyo, nombre };
}

export async function aplicarEventoApoyo(db: Db, e: EventoApoyo): Promise<void> {
  if (e.tipo === "apoyo-pagado") await anotarPago(db, e);
  if (e.tipo === "apoyo-cobrado") await registrarCobro(db, { ...e.cobro, apoyoId: e.apoyoId });
  if (e.tipo === "apoyo-cancelado") await cancelarApoyo(db, e.apoyoId);
}
