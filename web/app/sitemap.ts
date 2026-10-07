import type { MetadataRoute } from "next";

import { candidaturas, temas, vigente } from "@/lib/data";
import { urlDelSitio } from "@/lib/sitio";

/** sitemap.xml (spec 002, HU-2.9, HU-2.11 y HU-2.12): solo páginas públicas e indexables. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = urlDelSitio(process.env.NEXT_PUBLIC_SITE_URL).origin;
  const url = (ruta: string) => `${base}${ruta}`;
  const ahora = new Date();
  const fijas: [string, number][] = [
    ["/", 1],
    ["/elecciones-generales-2026", 0.9],
    ["/comparar", 0.9],
    ["/partidos", 0.8],
    ["/temas", 0.8],
    ["/pregunta", 0.7],
    ["/tu-papeleta", 0.7],
    ["/metodologia", 0.5],
    ["/condiciones", 0.2],
  ];
  const programas = candidaturas().flatMap((c) => {
    const v = vigente(c);
    return v.tipo === "programa" ? [`/programas/${c.id}/${v.convocatoria}`] : [];
  });
  // Partido × tema (HU-2.11): solo las que tienen contenido; las de «no menciona» son noindex
  const partidoTema = candidaturas().flatMap((c) => {
    const v = vigente(c);
    if (v.tipo !== "programa") return [];
    return temas()
      .filter((t) => v.analisis.temas[t.id]?.menciona)
      .map((t) => `/partidos/${c.id}/${t.id}`);
  });
  return [
    ...fijas.map(([ruta, priority]) => ({
      url: url(ruta),
      lastModified: ahora,
      changeFrequency: "daily" as const,
      priority,
    })),
    ...candidaturas().map((c) => ({
      url: url(`/partidos/${c.id}`),
      lastModified: ahora,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...temas().map((t) => ({
      url: url(`/temas/${t.id}`),
      lastModified: ahora,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...partidoTema.map((ruta) => ({
      url: url(ruta),
      lastModified: ahora,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
    ...programas.map((ruta) => ({
      url: url(ruta),
      lastModified: ahora,
      changeFrequency: "weekly" as const,
      priority: 0.4,
    })),
  ];
}
