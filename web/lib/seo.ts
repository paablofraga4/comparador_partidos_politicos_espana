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

type ConArticulo = { corto: string; articulo?: "el" | "la" | null };

/** «el PP», «el PSOE», «VOX», «Sumar»: como se nombra en una frase (y como se busca). */
export function conArticulo(c: ConArticulo): string {
  return c.articulo ? `${c.articulo} ${c.corto}` : c.corto;
}

/** «del PP», «de la X», «de VOX»: con la contracción del castellano. */
export function delPartido(c: ConArticulo): string {
  return c.articulo === "el" ? `del ${c.corto}` : `de ${conArticulo(c)}`;
}

/**
 * Título de una página partido × tema: la pregunta tal como se busca («Pensiones: qué propone el
 * PP…») y el número de propuestas, que sale del análisis. Con el programa del 29N lo dice.
 */
export function tituloPartidoTema(a: {
  tema: string;
  c: ConArticulo;
  propuestas: number;
  es29N: boolean;
}): string {
  const programa = a.es29N ? "su programa del 29N" : "su programa electoral";
  const cuantas =
    a.propuestas > 0 ? ` (${a.propuestas} ${a.propuestas === 1 ? "propuesta" : "propuestas"})` : "";
  return `${a.tema}: qué propone ${conArticulo(a.c)} en ${programa}${cuantas}`;
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
