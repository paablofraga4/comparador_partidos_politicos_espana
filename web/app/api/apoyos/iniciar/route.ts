import { urlBase } from "@/lib/bonos/http";
import { esTipo, leerImporte } from "@/lib/apoyos/config";
import { pasarelaApoyos } from "@/lib/apoyos/pasarela";
import { crearApoyoPendiente, vincularSesionApoyo } from "@/lib/apoyos/registro";
import { getDb, hayDb } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Formulario de apoyo (spec 005, HU-5.4): HTML sin JavaScript. Crea el apoyo pendiente y la
 * sesión de pago, y redirige a ella.
 */
export async function POST(req: Request) {
  const volver = (q: string) => Response.redirect(new URL(`/apoya?${q}#apoyar`, req.url), 303);
  const p = pasarelaApoyos();
  if (!p || !hayDb()) return volver("error=inactivo");

  const f = await req.formData().catch(() => null);
  const tipo = f?.get("tipo");
  if (!esTipo(tipo)) return volver("error=importe");
  const importeCent = leerImporte(tipo, String(f?.get("importe") ?? ""), String(f?.get("otro") ?? ""));
  if (!importeCent) return volver(`error=importe&tipo=${tipo}`);

  const db = await getDb();
  const apoyoId = await crearApoyoPendiente(db, tipo, importeCent);
  try {
    const sesion = await p.crearSesion({ apoyoId, tipo, importeCent, urlBase: urlBase(req) });
    await vincularSesionApoyo(db, apoyoId, sesion.id);
    return Response.redirect(sesion.url, 303);
  } catch (e) {
    console.error("⚠ no se pudo crear la sesión de apoyo:", (e as Error).message);
    return volver("error=pago");
  }
}
