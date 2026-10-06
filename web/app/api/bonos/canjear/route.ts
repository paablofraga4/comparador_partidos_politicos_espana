import { cookies } from "next/headers";

import { normalizarCodigo } from "@/lib/bonos/codigos";
import { COOKIE_BONO, opcionesBono } from "@/lib/bonos/cookies";
import { bonoPorCodigo, bonoUsable, intentoCanje } from "@/lib/bonos/cupo";
import { ipCliente } from "@/lib/bonos/http";
import { getDb, hayDb } from "@/lib/db";

export const runtime = "nodejs";

/** «Tengo un código» (spec 004, HU-4.6): guarda un bono comprado en este navegador. */
export async function POST(req: Request) {
  if (!hayDb()) return Response.json({ error: "No disponible" }, { status: 503 });
  const db = await getDb();
  if (!(await intentoCanje(db, ipCliente(req)))) {
    return Response.json(
      { error: "Demasiados intentos. Espera un rato y vuelve a probar." },
      { status: 429 },
    );
  }
  const { codigo: entrada } = (await req.json().catch(() => ({}))) as { codigo?: string };
  const codigo = normalizarCodigo(entrada ?? "");
  const bono = codigo ? await bonoPorCodigo(db, codigo) : null;
  if (!codigo || !bono || bono.estado === "pendiente") {
    return Response.json(
      { error: "Ese código no existe. Revisa que esté completo (VC-XXXX-XXXX-XXXX)." },
      { status: 404 },
    );
  }
  if (!bonoUsable(bono)) {
    const motivo =
      bono.estado === "anulado"
        ? "Ese bono se anuló porque se devolvió el pago."
        : bono.usadas >= bono.total
          ? "Ese bono ya no tiene preguntas."
          : "Ese bono ha caducado.";
    return Response.json({ error: motivo }, { status: 410 });
  }
  (await cookies()).set(COOKIE_BONO, codigo, opcionesBono(bono.caduca));
  return Response.json({ quedan: bono.total - bono.usadas, total: bono.total });
}
