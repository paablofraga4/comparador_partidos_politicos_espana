import type { Analisis, Cita } from "./schema/analisis";

export type { Analisis, Cita };
export type AnalisisTema = Analisis["temas"][string];
// El esquema marca como opcionales las listas con valor por defecto; en los datos siempre existen
export type Afirmacion = NonNullable<AnalisisTema["resumen"]>[number];
export type Propuesta = NonNullable<AnalisisTema["propuestas"]>[number];

export const CONVOCATORIAS = {
  "generales-2026": { nombre: "Generales 29N", fecha: "2026-11-29", corto: "29N" },
  "generales-2023": { nombre: "Generales 23J", fecha: "2023-07-23", corto: "2023" },
} as const;
export type ConvocatoriaId = keyof typeof CONVOCATORIAS;

export type Tema = {
  id: string;
  nombre: string;
  icono: string;
  descripcion: string;
  subtemas: string[];
};

export type CandidaturaEnConvocatoria = {
  programa_propio?: boolean | "por-verificar" | null;
  dentro_de?: string | null;
  estado?: "provisional" | "presentada" | "proclamada" | "no-proclamada" | null;
  circunscripciones?: string[];
};

export type Candidatura = {
  id: string;
  nombre: string;
  corto: string;
  tipo: "partido" | "coalicion" | "agrupacion-electores";
  ambito: "estatal" | "autonomico" | "provincial";
  territorio?: string | null;
  color: string;
  web: string;
  vigilar?: string[];
  incluir?: "siempre" | "si-concurre-por-separado" | null;
  nota?: string | null;
  miembros?: string[];
  convocatorias: Partial<Record<ConvocatoriaId, CandidaturaEnConvocatoria>>;
};

export type RegistroCandidaturas = {
  version: number;
  fase_inclusion: "provisional" | "presentadas" | "proclamadas";
  candidaturas: Candidatura[];
};

export type Fuente = {
  url: string;
  url_archivo?: string | null;
  fichero: string;
  sha256: string;
  descargado: string;
  origen: "pdf" | "html";
  paginas: number;
  idioma?: string | null;
  estado: "pendiente" | "publicado" | "analizado" | "aprobado";
  nota?: string | null;
};

/** Programa que se muestra para una candidatura (spec 001, HU-1.7). */
export type ProgramaVigente =
  | {
      tipo: "programa";
      convocatoria: ConvocatoriaId;
      analisis: Analisis;
      fuente: Fuente | null;
      /** true si es el de 2023 mostrado porque aún no hay programa aprobado del 29N */
      anterior: boolean;
      borrador: boolean;
    }
  | { tipo: "pendiente"; dentroDe: string | null };
