import { urlDelSitio } from "../sitio";

/** URL pública para las redirecciones de pago: la del sitio en producción; en desarrollo, el
 * Host con el que ha entrado la petición (así las cookies siguen en el mismo origen). */
export function urlBase(req: Request): string {
  if (process.env.NODE_ENV === "production") {
    return urlDelSitio(process.env.NEXT_PUBLIC_SITE_URL).origin;
  }
  const host = req.headers.get("host");
  return host ? `${new URL(req.url).protocol}//${host}` : new URL(req.url).origin;
}

/**
 * IP de quien pregunta, para los límites por conexión (nunca se guarda en claro). Con el dominio
 * detrás de Cloudflare, `cf-connecting-ip` la pone Cloudflare y no se puede falsear desde fuera;
 * el primer valor de `x-forwarded-for` sí lo puede inventar el cliente, así que va después.
 */
export function ipCliente(req: Request): string {
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const xff = req.headers.get("x-forwarded-for");
  return (xff?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "local").trim();
}
