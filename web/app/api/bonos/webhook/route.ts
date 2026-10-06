import { activarBono, anularPorPago } from "@/lib/bonos/cupo";
import { pasarela } from "@/lib/bonos/pasarela";
import { getDb, hayDb } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Avisos de la pasarela (spec 004, HU-4.5 y HU-4.7): activa el bono aunque la persona cierre la
 * pestaña antes de volver, y lo anula si se devuelve el pago. La firma se comprueba siempre.
 */
export async function POST(req: Request) {
  const p = pasarela();
  if (!p || !hayDb()) return new Response("Pagos desactivados", { status: 503 });
  const cuerpo = await req.text();
  let evento;
  try {
    evento = await p.leerEvento(cuerpo, req.headers.get("stripe-signature"));
  } catch {
    return new Response("Firma no válida", { status: 400 });
  }
  const db = await getDb();
  if (evento.tipo === "pagado") await activarBono(db, evento.bonoId, evento.pago);
  if (evento.tipo === "devuelto") await anularPorPago(db, evento.pago);
  return Response.json({ recibido: true });
}
