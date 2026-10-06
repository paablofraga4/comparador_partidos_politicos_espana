import { cookies } from "next/headers";

import { COOKIE_BONO, COOKIE_USO } from "@/lib/bonos/cookies";
import { bonoPorCodigo, bonoUsable, usadasGratis } from "@/lib/bonos/cupo";
import { presupuestoAgotado } from "@/lib/chat/limites";
import type { CupoChat } from "@/lib/chat/tipos";
import { numeroEnv } from "@/lib/config";
import { getDb, hayDb } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Lo que le queda a este navegador (spec 004, HU-4.2). Solo lee: no crea cookies. */
export async function GET() {
  if (!hayDb()) return Response.json({ error: "Sin base de datos" }, { status: 503 });
  const db = await getDb();
  const jar = await cookies();
  const total = numeroEnv("CHAT_GRATIS_TOTAL", 2);
  const usadas = await usadasGratis(db, jar.get(COOKIE_USO)?.value);
  const b = await bonoPorCodigo(db, jar.get(COOKIE_BONO)?.value);
  const gratis: CupoChat = { tipo: "gratis", quedan: Math.max(total - usadas, 0), total };
  const bono: CupoChat | null =
    b && bonoUsable(b)
      ? { tipo: "bono", quedan: b.total - b.usadas, total: b.total, caduca: b.caduca.toISOString() }
      : null;
  return Response.json(
    {
      gratis,
      bono,
      bonoTerminado: !!b && !bono,
      gratisPausado: await presupuestoAgotado(db, "gratis"),
    },
    { headers: { "cache-control": "no-store" } },
  );
}
