import { urlDelSitio } from "../sitio";

/** URL pública para las redirecciones de pago: la del sitio en producción; la de la petición
 * en desarrollo (así funciona en cualquier puerto). */
export function urlBase(req: Request): string {
  return process.env.NODE_ENV === "production"
    ? urlDelSitio(process.env.NEXT_PUBLIC_SITE_URL).origin
    : new URL(req.url).origin;
}

export function ipCliente(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  return (xff?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "local").trim();
}
