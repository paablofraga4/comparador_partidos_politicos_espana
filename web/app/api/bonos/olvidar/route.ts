import { cookies } from "next/headers";

import { COOKIE_BONO } from "@/lib/bonos/cookies";

/** «Quitar el bono de este navegador» (dispositivos compartidos). El bono sigue existiendo. */
export async function POST() {
  (await cookies()).delete(COOKIE_BONO);
  return Response.json({ ok: true });
}
