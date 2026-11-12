/** Tipos y textos compartidos por «Tu papeleta» y las páginas por provincia (spec 006). */
export type CandidaturaPapeleta = {
  id: string;
  corto: string;
  nombre: string;
  color: string;
  listas: Record<string, string>;
  programa: "29N" | "2023" | "publicado" | "pendiente";
  /** Coalición de 2023 cuyo programa se muestra (Sumar para Frente Amplio) */
  programaDe?: string | null;
};

const ETIQUETA = {
  "29N": "Programa del 29N",
  "2023": "Programa de 2023 (anterior)",
  publicado: "Programa del 29N publicado",
  pendiente: "Sin programa publicado",
} as const;

/** Origen del programa de una candidatura, con el mismo texto en todas las pantallas. */
export function etiquetaPapeleta(c: Pick<CandidaturaPapeleta, "programa" | "programaDe">): string {
  return c.programaDe
    ? `Programa de 2023 de ${c.programaDe} (coalición anterior)`
    : ETIQUETA[c.programa];
}

/** Las candidaturas de una circunscripción, en orden alfabético (constitución I.2). */
export function enProvincia(cs: CandidaturaPapeleta[], provincia: string): CandidaturaPapeleta[] {
  return cs
    .filter((c) => c.listas[provincia])
    .sort((a, b) => a.corto.localeCompare(b.corto, "es", { sensitivity: "base" }));
}
