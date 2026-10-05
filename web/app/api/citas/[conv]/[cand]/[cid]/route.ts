import { NextResponse } from "next/server";

import { analisis, candidatura, fuente } from "@/lib/data";
import { CONVOCATORIAS, type ConvocatoriaId } from "@/lib/types";

/** Datos de una cita para el panel de fuente (también sirve las URLs compartidas). */
export async function GET(_req: Request, ctx: RouteContext<"/api/citas/[conv]/[cand]/[cid]">) {
  const { conv, cand, cid } = await ctx.params;
  if (!(conv in CONVOCATORIAS))
    return NextResponse.json({ error: "convocatoria" }, { status: 404 });
  const c = conv as ConvocatoriaId;
  const a = analisis(c, cand);
  const cita = a?.citas[cid];
  const ca = candidatura(cand);
  const f = fuente(c, cand);
  if (!a || !cita || !ca || !f)
    return NextResponse.json({ error: "no encontrada" }, { status: 404 });
  return NextResponse.json(
    {
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
    { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" } },
  );
}
