/**
 * Reglas de negocio puras (sin E/S), cubiertas por tests:
 *  - qué programa se muestra de cada candidatura (spec 001, HU-1.7)
 *  - qué candidaturas aparecen según la fase de inclusión (constitución I.6)
 *  - orden alfabético (constitución I.2)
 */
import type {
  Analisis,
  Candidatura,
  ConvocatoriaId,
  Fuente,
  ProgramaVigente,
  RegistroCandidaturas,
} from "./types";

type Analisis2 = Partial<Record<ConvocatoriaId, Analisis | null | undefined>>;
type Fuentes2 = Partial<Record<ConvocatoriaId, Fuente | null | undefined>>;

export function programaVigente(
  cand: Candidatura,
  analisis: Analisis2,
  fuentes: Fuentes2,
  opts: { mostrarBorradores: boolean },
): ProgramaVigente {
  const publicable = (a: Analisis | null | undefined): a is Analisis =>
    !!a && (a.estado === "aprobado" || opts.mostrarBorradores);

  const a26 = analisis["generales-2026"];
  if (publicable(a26)) {
    return {
      tipo: "programa",
      convocatoria: "generales-2026",
      analisis: a26,
      fuente: fuentes["generales-2026"] ?? null,
      anterior: false,
      borrador: a26.estado !== "aprobado",
    };
  }

  // Fallback a 2023 SOLO si concurrió con programa propio (no el de una coalición ajena)
  const c23 = cand.convocatorias["generales-2023"];
  const a23 = analisis["generales-2023"];
  if (c23?.programa_propio === true && publicable(a23)) {
    return {
      tipo: "programa",
      convocatoria: "generales-2023",
      analisis: a23,
      fuente: fuentes["generales-2023"] ?? null,
      anterior: true,
      borrador: a23.estado !== "aprobado",
    };
  }
  return { tipo: "pendiente", dentroDe: c23?.dentro_de ?? null };
}

export function candidaturasVisibles(reg: RegistroCandidaturas): Candidatura[] {
  const visibles = reg.candidaturas.filter((c) => {
    const e26 = c.convocatorias["generales-2026"]?.estado;
    if (reg.fase_inclusion === "provisional") {
      if (c.incluir === "siempre") return true;
      return e26 === "presentada" || e26 === "proclamada";
    }
    if (reg.fase_inclusion === "presentadas") return e26 === "presentada" || e26 === "proclamada";
    return e26 === "proclamada";
  });
  return ordenAlfabetico(visibles);
}

export function ordenAlfabetico<T extends { corto: string }>(items: T[]): T[] {
  return [...items].sort((a, b) =>
    a.corto.localeCompare(b.corto, "es", { sensitivity: "base", ignorePunctuation: true }),
  );
}

/** Convierte «Co- munidad» en «Comunidad» al mostrar literales (solo presentación). */
export function limpiarLiteral(texto: string): string {
  return texto.replace(/(\p{L})- (\p{Ll})/gu, "$1$2");
}
