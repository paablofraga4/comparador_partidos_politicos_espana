import { candidaturas, temas } from "@/lib/data";
import { urlDelSitio } from "@/lib/sitio";

/**
 * llms.txt (spec 002, HU-2.9): guía para buscadores y asistentes con IA. Qué es VotoClaro, sus
 * principios y los enlaces principales; los partidos, en orden alfabético como en la web.
 */
export const dynamic = "force-static";

export function GET() {
  const base = urlDelSitio(process.env.NEXT_PUBLIC_SITE_URL).origin;
  const cs = [...candidaturas()].sort((a, b) => a.corto.localeCompare(b.corto, "es"));
  const texto = `# VotoClaro

> Comparador neutral de los programas electorales de las elecciones generales de España del 29 de noviembre de 2026. Cada afirmación enlaza a la página exacta del programa oficial, con el fragmento resaltado. Mientras un partido no publica su programa del 29N, se muestra el de 2023 (23J), avisado.

Principios:
- Solo usa los programas oficiales; si un programa no trata un tema, dice «No lo menciona».
- Mismo trato para todos los partidos, en orden alfabético; sin valoraciones, rankings ni recomendaciones de voto.
- Proyecto independiente, sin relación con ningún partido. Sin anuncios.

## Páginas principales
- [Comparar partidos por temas](${base}/comparar)
- [Partidos](${base}/partidos)
- [Temas](${base}/temas)
- [Pregunta sobre los programas](${base}/pregunta): asistente que responde citando cada frase.
- [Tu papeleta](${base}/tu-papeleta): candidaturas al Congreso por provincia (BOE).
- [Cómo lo hacemos](${base}/metodologia): criterios, fuentes y verificación.

## Partidos
${cs.map((c) => `- [${c.nombre}](${base}/partidos/${c.id})`).join("\n")}

## Temas
${temas()
  .map((t) => `- [${t.nombre}](${base}/temas/${t.id})`)
  .join("\n")}
`;
  return new Response(texto, { headers: { "content-type": "text/markdown; charset=utf-8" } });
}
