import { aplicarEventoApoyo } from "@/lib/apoyos/eventos";
import { devolverCobroPorPago } from "@/lib/apoyos/registro";
import { activarBono, anularPorPago } from "@/lib/bonos/cupo";
import { pasarelaEventos } from "@/lib/bonos/pasarela";
import { getDb, hayDb } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Avisos de la pasarela, que comparten bonos (spec 004, HU-4.5 y HU-4.7) y apoyos (spec 005):
 * activa el bono o el apoyo aunque la persona cierre la pestaña antes de volver, cuenta cada
 * mes de los apoyos mensuales y anula lo que se devuelve. La firma se comprueba siempre.
 */
export async function POST(req: Request) {
  const p = pasarelaEventos();
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
  if (evento.tipo === "devuelto") {
    await anularPorPago(db, evento.pago);
    await devolverCobroPorPago(db, evento.pago);
  }
  if (
    evento.tipo === "apoyo-pagado" ||
    evento.tipo === "apoyo-cobrado" ||
    evento.tipo === "apoyo-cancelado"
  ) {
    await aplicarEventoApoyo(db, evento);
  }
  return Response.json({ recibido: true });
}
