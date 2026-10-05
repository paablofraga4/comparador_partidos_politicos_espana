import "server-only";

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "yaml";

import { candidaturasVisibles, programaVigente } from "./reglas";
import type {
  Analisis,
  Candidatura,
  ConvocatoriaId,
  Fuente,
  ProgramaVigente,
  RegistroCandidaturas,
  Tema,
} from "./types";

/** Carpeta data/ del repo (en Docker se copia junto a la app). */
export const DATA_DIR = process.env.VC_DATA_DIR ?? path.resolve(process.cwd(), "..", "data");

/** Vista previa: muestra análisis en borrador con una marca visible. Nunca en producción. */
export const MOSTRAR_BORRADORES = process.env.VC_MOSTRAR_BORRADORES === "1";

const cache = new Map<string, unknown>();
function memo<T>(key: string, load: () => T): T {
  if (process.env.NODE_ENV === "development") return load();
  if (!cache.has(key)) cache.set(key, load());
  return cache.get(key) as T;
}

function readYaml<T>(file: string): T {
  return parse(readFileSync(path.join(DATA_DIR, file), "utf8")) as T;
}

export function registro(): RegistroCandidaturas {
  return memo("candidaturas", () => readYaml<RegistroCandidaturas>("candidaturas.yaml"));
}

export function temas(): Tema[] {
  return memo("temas", () => readYaml<{ temas: Tema[] }>("topics.yaml").temas);
}

export function tema(id: string): Tema | undefined {
  return temas().find((t) => t.id === id);
}

type Fuentes = { convocatorias: Record<string, { programas: Record<string, Fuente> }> };

export function fuente(conv: ConvocatoriaId, cand: string): Fuente | null {
  const f = memo("fuentes", () => readYaml<Fuentes>("sources.yaml"));
  return f.convocatorias[conv]?.programas?.[cand] ?? null;
}

export function analisis(conv: ConvocatoriaId, cand: string): Analisis | null {
  return memo(`a:${conv}:${cand}`, () => {
    const p = path.join(DATA_DIR, "analyses", conv, `${cand}.json`);
    return existsSync(p) ? (JSON.parse(readFileSync(p, "utf8")) as Analisis) : null;
  });
}

export function candidaturas(): Candidatura[] {
  return candidaturasVisibles(registro());
}

export function candidatura(id: string): Candidatura | undefined {
  return registro().candidaturas.find((c) => c.id === id);
}

export function vigente(cand: Candidatura): ProgramaVigente {
  return programaVigente(
    cand,
    {
      "generales-2026": analisis("generales-2026", cand.id),
      "generales-2023": analisis("generales-2023", cand.id),
    },
    {
      "generales-2026": fuente("generales-2026", cand.id),
      "generales-2023": fuente("generales-2023", cand.id),
    },
    { mostrarBorradores: MOSTRAR_BORRADORES },
  );
}

/** Resumen del estado de publicación de programas del 29N (tira de la portada). */
export function estadoProgramas29N() {
  const cs = candidaturas();
  const con29N = cs.filter((c) => {
    const a = analisis("generales-2026", c.id);
    return a && (a.estado === "aprobado" || MOSTRAR_BORRADORES);
  }).length;
  return { total: cs.length, con29N };
}
