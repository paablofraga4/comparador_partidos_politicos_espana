import "server-only";

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "yaml";

import type { CosteFijo } from "./apoyos/cuentas";
import { candidaturasVisibles, programaVigente } from "./reglas";
import type {
  Analisis,
  Candidatura,
  Circunscripcion,
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

/** Circunscripciones al Congreso según el BOE (vacío hasta que se publiquen las candidaturas). */
export function circunscripciones(): Circunscripcion[] {
  return memo("circunscripciones", () =>
    existsSync(path.join(DATA_DIR, "circunscripciones.yaml"))
      ? readYaml<{ circunscripciones: Circunscripcion[] }>("circunscripciones.yaml")
          .circunscripciones
      : [],
  );
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

/** Costes fijos con las cifras de las facturas (spec 005, HU-5.3). */
export function costesFijos(): CosteFijo[] {
  return memo("costes", () =>
    (readYaml<{ fijos: CosteFijo[] }>("costes.yaml").fijos ?? []).map((c) => {
      // El YAML puede leer la fecha como Date: siempre AAAA-MM-DD
      const f = c.actualizado as unknown;
      return { ...c, actualizado: (f instanceof Date ? f.toISOString() : String(f)).slice(0, 10) };
    }),
  );
}

/**
 * IA gastada en la carga de los programas (spec 005, HU-5.3): la suma de lo que registró cada
 * análisis al generarse (análisis y lectura fácil). Es un mínimo: solo queda la última
 * generación de cada programa, no los reintentos.
 */
export function cargaIa(): { usd: number; programas: number } {
  return memo("cargaIa", () => {
    const base = path.join(DATA_DIR, "analyses");
    let usd = 0;
    let programas = 0;
    // Solo las carpetas de convocatoria (en analyses/ también hay un .gitkeep)
    const convs = existsSync(base)
      ? readdirSync(base, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)
      : [];
    for (const conv of convs) {
      for (const f of readdirSync(path.join(base, conv)).filter((x) => x.endsWith(".json"))) {
        const a = JSON.parse(readFileSync(path.join(base, conv, f), "utf8")) as Analisis;
        if (typeof a.generado?.coste_usd === "number") {
          usd += a.generado.coste_usd;
          programas++;
        }
      }
    }
    return { usd, programas };
  });
}

/**
 * Siglas y nombres de todas las candidaturas del registro, para el filtro de nombres del tablón
 * (spec 005, HU-5.6). Las siglas de varias palabras («EH Bildu») cuentan también por partes.
 */
export function nombresDePartidos(): string[] {
  return memo("nombresPartidos", () =>
    registro().candidaturas.flatMap((c) => [
      c.corto,
      c.nombre,
      ...c.corto.split(/\s+/).filter((p) => p.length >= 2),
    ]),
  );
}
