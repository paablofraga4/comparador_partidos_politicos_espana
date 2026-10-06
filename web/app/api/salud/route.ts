import { candidaturas } from "@/lib/data";
import { getDb, hayDb } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Healthcheck de Railway y estado del chat (sin datos sensibles). */
export async function GET() {
  const chat: Record<string, unknown> = {
    activo: process.env.CHAT_ACTIVO === "1",
    db: hayDb(),
    clave: !!process.env.OPENAI_API_KEY,
  };
  if (hayDb()) {
    try {
      const db = await getDb();
      const [r] = await db.query<{ fragmentos: number; con_embedding: number; propuestas: number }>(
        `select (select count(*)::int from fragmentos) as fragmentos,
                (select count(*)::int from fragmentos where embedding is not null) as con_embedding,
                (select count(*)::int from propuestas) as propuestas`,
      );
      chat.indices = r;
    } catch (e) {
      // Solo el código (42P01 = falta la tabla; ENOTFOUND/ECONNREFUSED… = conexión), nunca el
      // mensaje: podría incluir el host o el usuario de la base de datos
      const codigo = (e as { code?: unknown }).code;
      chat.indices =
        codigo === "42P01" ? "sin migrar" : `error ${typeof codigo === "string" ? codigo : "?"}`;
    }
  }
  const version = process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7);
  return Response.json({ ok: true, version, candidaturas: candidaturas().length, chat });
}
