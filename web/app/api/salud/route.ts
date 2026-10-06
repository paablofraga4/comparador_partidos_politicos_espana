import { candidaturas } from "@/lib/data";

/** Healthcheck de Railway: comprueba que la app arranca y lee data/. */
export function GET() {
  return Response.json({ ok: true, candidaturas: candidaturas().length });
}
