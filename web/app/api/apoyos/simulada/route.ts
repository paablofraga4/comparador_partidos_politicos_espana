import { estadoApoyos } from "@/lib/apoyos/config";
import { sesionesApoyoSimuladas } from "@/lib/apoyos/pasarela";
import { euros } from "@/lib/bonos/planes";

export const dynamic = "force-dynamic";

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Pago simulado de un apoyo (spec 005): solo en desarrollo, para probar el flujo sin Stripe. */
export async function GET(req: Request) {
  const estado = estadoApoyos();
  if (!estado.activos || estado.pasarela !== "simulada") {
    return new Response("No disponible", { status: 404 });
  }
  const url = new URL(req.url);
  const id = url.searchParams.get("sesion") ?? "";
  const s = sesionesApoyoSimuladas().get(id);
  if (!s) return new Response("Sesión desconocida", { status: 404 });

  const accion = url.searchParams.get("accion");
  if (accion === "pagar") {
    s.pagada = true;
    s.nombre = url.searchParams.get("nombre") || null;
    return Response.redirect(new URL(`/api/apoyos/confirmar?sesion=${id}`, req.url), 303);
  }
  if (accion === "cancelar") return Response.redirect(new URL("/apoya?pago=cancelado#apoyar", req.url), 303);

  const cuanto = `${euros(s.importeCent)}${s.tipo === "mensual" ? " al mes" : ""}`;
  const html = `<!doctype html><html lang="es"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Apoyo simulado</title>
<body style="font-family:system-ui;max-width:28rem;margin:4rem auto;padding:0 1rem">
<h1>Apoyo simulado</h1><p>Solo en desarrollo: no se cobra nada.</p>
<p>Apoyo de <strong>${esc(cuanto)}</strong> · <code>${esc(s.apoyoId)}</code></p>
<form method="get"><input type="hidden" name="sesion" value="${esc(id)}">
<label>Nombre o alias para el tablón (opcional)<br><input name="nombre" maxlength="40"></label>
<p><button name="accion" value="pagar">Pagar</button> <button name="accion" value="cancelar">Cancelar</button></p>
</form></body></html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}
