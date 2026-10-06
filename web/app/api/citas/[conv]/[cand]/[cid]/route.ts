import { NextResponse } from "next/server";

import { analisis, candidatura, fuente } from "@/lib/data";
import { getDb, hayDb } from "@/lib/db";
import { CONVOCATORIAS, type ConvocatoriaId } from "@/lib/types";

const CACHE = { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" };

/**
 * Datos de una fuente para el panel (también sirve las URLs compartidas):
 *  - cita verificada de un análisis (c0012): literal exacto + rectángulos de resaltado
 *  - fragmento citado por el chat (pp-23-p047-02): párrafo + su caja en la página
 */
export async function GET(_req: Request, ctx: RouteContext<"/api/citas/[conv]/[cand]/[cid]">) {
  const { conv, cand, cid } = await ctx.params;
  if (!(conv in CONVOCATORIAS))
    return NextResponse.json({ error: "convocatoria" }, { status: 404 });
  const c = conv as ConvocatoriaId;
  const ca = candidatura(cand);
  const f = fuente(c, cand);
  if (!ca || !f) return NextResponse.json({ error: "no encontrada" }, { status: 404 });

  let cita: unknown = null;
  let tipo: "cita" | "fragmento" = "cita";
  if (/^c\d{4}$/.test(cid)) {
    cita = analisis(c, cand)?.citas[cid] ?? null;
  } else if (hayDb() && /^[a-z0-9-]{3,80}$/.test(cid)) {
    tipo = "fragmento";
    const db = await getDb();
    const [fr] = await db.query<{
      pagina: number;
      etiqueta: string | null;
      texto: string;
      rect: [number, number, number, number] | null;
    }>(
      "select pagina, etiqueta, texto, rect from fragmentos where id = $1 and conv = $2 and cand = $3",
      [cid, c, cand],
    );
    if (fr) {
      cita = {
        pagina: fr.pagina,
        pagina_impresa: fr.etiqueta,
        literal: fr.texto.length > 900 ? `${fr.texto.slice(0, 900)}…` : fr.texto,
        idioma: "es",
        traduccion: null,
        rects: fr.rect ? [{ pagina: fr.pagina, r: fr.rect }] : [],
        resaltada: !!fr.rect,
      };
    }
  }
  if (!cita) return NextResponse.json({ error: "no encontrada" }, { status: 404 });

  return NextResponse.json(
    {
      tipo,
      cita,
      convocatoria: { id: c, ...CONVOCATORIAS[c] },
      candidatura: { id: ca.id, nombre: ca.nombre, corto: ca.corto, color: ca.color },
      documento: {
        url: `/documentos/${c}/${cand}.pdf`,
        original: f.url,
        archivo: f.url_archivo ?? null,
        paginas: f.paginas,
        sha256: f.sha256,
        descargado: f.descargado,
      },
    },
    { headers: CACHE },
  );
}
