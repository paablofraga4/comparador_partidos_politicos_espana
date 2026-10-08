import { pasarelaApoyos } from "@/lib/apoyos/pasarela";
import { anotarPago } from "@/lib/apoyos/eventos";
import { getDb, hayDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Vuelta del pago (spec 005, HU-5.4): se comprueba la sesión con la pasarela (nunca nos fiamos
 * de la URL), se activa el apoyo y se cuenta su primer cobro. El webhook hace lo mismo, por si
 * la persona cierra la pestaña antes de volver.
 */
export async function GET(req: Request) {
  const destino = (ruta: string) => Response.redirect(new URL(ruta, req.url), 303);
  const id = new URL(req.url).searchParams.get("sesion");
  const p = pasarelaApoyos();
  if (!id || !p || !hayDb()) return destino("/apoya");

  const s = await p.leerSesion(id).catch(() => null);
  if (!s?.pagada || !s.apoyoId) return destino("/apoya?pago=pendiente#apoyar");

  const db = await getDb();
  const r = await anotarPago(db, { apoyoId: s.apoyoId, nombre: s.nombre, cobro: s.cobro });
  if (!r) return destino("/apoya?pago=error#apoyar");
  // Solo el estado del nombre viaja en la URL, nunca el nombre
  return destino(`/apoya/gracias?tipo=${r.apoyo.tipo}&nombre=${r.nombre}`);
}
