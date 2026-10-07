import type { Metadata } from "next";

/** Imagen de marca para compartir (app/opengraph-image.tsx). Las páginas que definen su propio
 * `openGraph` la pierden por herencia, así que se declara aquí explícitamente. */
export const IMAGEN_COMPARTIR = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: "¿Qué propone cada partido? Los programas electorales del 29N, explicados y con la fuente.",
};

/** Recorta un texto para una descripción, en el último espacio antes del límite. */
export function extracto(texto: string, max = 155): string {
  const t = texto.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const corte = t.lastIndexOf(" ", max - 1);
  return `${t.slice(0, corte > 0 ? corte : max - 1).replace(/[,;:.]$/, "")}…`;
}

export type Miga = { nombre: string; ruta: string };

/** Datos estructurados de migas de pan (Google las muestra en los resultados). */
export function datosMigas(migas: Miga[], base: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: migas.map((m, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: m.nombre,
      item: `${base}${m.ruta}`,
    })),
  };
}

/** «PP (Partido Popular)»; si las siglas y el nombre coinciden, solo uno («Sumar»). Así los
 * textos no dependen del artículo de cada partido («del PSOE», «de Sumar»). */
export function nombrePartido(c: { corto: string; nombre: string }): string {
  return c.corto === c.nombre ? c.corto : `${c.corto} (${c.nombre})`;
}

/**
 * Metadatos de una página indexable (spec 002, HU-2.9): título, descripción, URL canónica sin
 * parámetros y Open Graph/X con los mismos textos. La imagen de compartir es la de marca
 * (app/opengraph-image.tsx), igual para todas las páginas.
 */
export function metaPagina({
  titulo,
  descripcion,
  ruta,
}: {
  titulo: string;
  descripcion: string;
  ruta: string;
}): Metadata {
  const tituloCompleto = ruta === "/" ? titulo : `${titulo} · VotoClaro`;
  return {
    title: ruta === "/" ? { absolute: titulo } : titulo,
    description: descripcion,
    alternates: { canonical: ruta },
    openGraph: {
      type: "website",
      locale: "es_ES",
      siteName: "VotoClaro",
      url: ruta,
      title: tituloCompleto,
      description: descripcion,
      images: [IMAGEN_COMPARTIR],
    },
    twitter: {
      card: "summary_large_image",
      title: tituloCompleto,
      description: descripcion,
      images: [IMAGEN_COMPARTIR.url],
    },
  };
}
