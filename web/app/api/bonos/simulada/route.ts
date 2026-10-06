import { estadoPagos } from "@/lib/bonos/pagos";
import { sesionesSimuladas } from "@/lib/bonos/pasarela";

export const dynamic = "force-dynamic";

/** Pago simulado (spec 004, HU-4.8): solo en desarrollo, para probar el flujo sin Stripe. */
export async function GET(req: Request) {
  const estado = estadoPagos();
  if (!estado.activos || estado.pasarela !== "simulada") {
    return new Response("No disponible", { status: 404 });
  }
  const url = new URL(req.url);
  const id = url.searchParams.get("sesion") ?? "";
  const s = sesionesSimuladas().get(id);
  if (!s) return new Response("Sesión desconocida", { status: 404 });

  const accion = url.searchParams.get("accion");
  if (accion === "pagar") {
    s.pagada = true;
    return Response.redirect(new URL(`/api/bonos/confirmar?sesion=${id}`, req.url), 303);
  }
  if (accion === "cancelar")
    return Response.redirect(new URL("/pregunta?pago=cancelado", req.url), 303);

  const html = `<!doctype html><html lang="es"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Pago simulado</title>
<body style="font-family:system-ui;max-width:28rem;margin:4rem auto;padding:0 1rem">
<h1>Pago simulado</h1><p>Solo en desarrollo: no se cobra nada.</p>
<p>Código del bono: <strong>${s.codigo}</strong></p>
<p><a href="?sesion=${id}&accion=pagar">Pagar</a> · <a href="?sesion=${id}&accion=cancelar">Cancelar</a></p>
</body></html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}
