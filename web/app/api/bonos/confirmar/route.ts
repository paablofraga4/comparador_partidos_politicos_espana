import { NextResponse } from "next/server";

import { hashCodigo, normalizarCodigo } from "@/lib/bonos/codigos";
import { COOKIE_BONO, opcionesBono } from "@/lib/bonos/cookies";
import { activarBono } from "@/lib/bonos/cupo";
import { pasarela } from "@/lib/bonos/pasarela";
import { getDb, hayDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Vuelta del pago (spec 004, HU-4.5): se comprueba la sesión con la pasarela (nunca nos fiamos
 * de la URL), se activa el bono y se guarda su código en este navegador.
 */
export async function GET(req: Request) {
  const destino = (ruta: string) => Response.redirect(new URL(ruta, req.url), 303);
  const id = new URL(req.url).searchParams.get("sesion");
  const p = pasarela();
  if (!id || !p || !hayDb()) return destino("/pregunta");

  const s = await p.leerSesion(id).catch(() => null);
  if (!s?.pagada || !s.bonoId || !s.codigo) return destino("/pregunta?pago=pendiente");

  const db = await getDb();
  const codigo = normalizarCodigo(s.codigo);
  const [fila] = await db.query<{ codigo_hash: string }>(
    "select codigo_hash from bonos where id = $1",
    [s.bonoId],
  );
  // El código de los metadatos tiene que ser el de este bono
  if (!codigo || fila?.codigo_hash !== hashCodigo(codigo)) return destino("/pregunta?pago=error");

  const bono = await activarBono(db, s.bonoId, s.pago);
  if (!bono) return destino("/pregunta?pago=error");
  // Response.redirect tiene cabeceras inmutables: la cookie va en un NextResponse
  const res = NextResponse.redirect(new URL("/bono?nuevo=1", req.url), 303);
  res.cookies.set(COOKIE_BONO, codigo, opcionesBono(bono.caduca));
  return res;
}
