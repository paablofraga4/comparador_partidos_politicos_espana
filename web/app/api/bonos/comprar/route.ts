import { nuevoCodigo } from "@/lib/bonos/codigos";
import { crearBonoPendiente, vincularSesion } from "@/lib/bonos/cupo";
import { urlBase } from "@/lib/bonos/http";
import { pasarela } from "@/lib/bonos/pasarela";
import { planPorId } from "@/lib/bonos/planes";
import { getDb, hayDb } from "@/lib/db";

export const runtime = "nodejs";

/** Crea un bono pendiente y la sesión de pago (spec 004, HU-4.5). Devuelve la URL de pago. */
export async function POST(req: Request) {
  const p = pasarela();
  if (!p || !hayDb()) {
    return Response.json({ error: "Los bonos todavía no están disponibles." }, { status: 503 });
  }
  const { plan: idPlan } = (await req.json().catch(() => ({}))) as { plan?: string };
  const plan = planPorId(idPlan ?? "");
  if (!plan) return Response.json({ error: "Plan no válido" }, { status: 400 });

  const db = await getDb();
  const codigo = nuevoCodigo();
  const bonoId = await crearBonoPendiente(db, plan, codigo);
  try {
    const sesion = await p.crearSesion({ bonoId, codigo, plan, urlBase: urlBase(req) });
    await vincularSesion(db, bonoId, sesion.id);
    return Response.json({ url: sesion.url });
  } catch (e) {
    console.error("⚠ no se pudo crear la sesión de pago:", (e as Error).message);
    return Response.json(
      { error: "No se ha podido abrir el pago. Inténtalo de nuevo en unos minutos." },
      { status: 502 },
    );
  }
}
