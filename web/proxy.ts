import { NextResponse, type NextRequest } from "next/server";

import { urlDelSitio } from "@/lib/sitio";

/**
 * Con dominio propio, la dirección de Railway (*.up.railway.app) redirige al dominio (301): una
 * sola URL para los buscadores (spec 002, HU-2.9). La API queda fuera del `matcher`: los
 * webhooks de Stripe y el healthcheck siguen funcionando en cualquier dirección.
 */
export function proxy(req: NextRequest) {
  const sitio = urlDelSitio(process.env.NEXT_PUBLIC_SITE_URL);
  const host = req.headers.get("host") ?? "";
  if (!host.endsWith(".up.railway.app") || host === sitio.host || sitio.hostname === "localhost") {
    return NextResponse.next();
  }
  return NextResponse.redirect(
    new URL(`${req.nextUrl.pathname}${req.nextUrl.search}`, sitio.origin),
    301,
  );
}

export const config = {
  // Todo menos la API, los recursos de Next y los archivos estáticos (con extensión)
  matcher: ["/((?!api/|_next/|.*\\.[a-z0-9]+$).*)"],
};
