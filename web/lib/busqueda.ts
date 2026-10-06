/**
 * Búsqueda híbrida del chat (plan técnico D7): léxica (FTS en español, modo «o») + semántica
 * (pgvector), fusionadas con RRF. Simétrica: con varias candidaturas se busca en cada una con
 * el mismo presupuesto, para no favorecer a los programas más largos (spec 001).
 */
import type { Db } from "./db";
import { vec } from "./db";
import { consultaLexica, plegar } from "./texto";

export type Ambito = { cand: string; conv: string }[];

export type FragmentoEncontrado = {
  id: string;
  conv: string;
  cand: string;
  pagina: number;
  etiqueta: string | null;
  seccion: string;
  texto: string;
};

export type PropuestaEncontrada = {
  id: string;
  conv: string;
  cand: string;
  tema: string;
  subtema: string;
  tipo: "propuesta" | "resumen";
  texto: string;
  citas: { cid: string; pagina: number; pagina_impresa: string | null }[];
};

/** Reciprocal Rank Fusion: suma 1/(k + posición) de cada lista. */
export function rrf(listas: string[][], k = 60): string[] {
  const puntos = new Map<string, number>();
  for (const lista of listas) {
    lista.forEach((id, i) => puntos.set(id, (puntos.get(id) ?? 0) + 1 / (k + i + 1)));
  }
  return [...puntos.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
}

const CANDIDATOS = 40;

async function idsHibridos(
  db: Db,
  tabla: "fragmentos" | "propuestas",
  consulta: string,
  embedding: number[] | null,
  ambito: Ambito,
): Promise<string[]> {
  const claves = ambito.map((a) => `${a.cand}:${a.conv}`);
  const filtro = "(cand || ':' || conv) = any($2::text[])";
  const tsq = consultaLexica(consulta);
  const lex = tsq
    ? await db.query<{ id: string }>(
        `select id from ${tabla}, to_tsquery('spanish', $1) q
         where busqueda @@ q and ${filtro}
         order by ts_rank_cd(busqueda, q) desc limit ${CANDIDATOS}`,
        [tsq, claves],
      )
    : [];
  const sem = embedding
    ? await db.query<{ id: string }>(
        `select id from ${tabla} where embedding is not null and ${filtro}
         order by embedding <=> $1::vector limit ${CANDIDATOS}`,
        [vec(embedding), claves],
      )
    : [];
  return rrf([lex.map((r) => r.id), sem.map((r) => r.id)]);
}

async function porCandidatura<T extends { id: string }>(
  ambito: Ambito,
  k: number,
  kPorCand: number,
  buscar: (amb: Ambito, k: number) => Promise<T[]>,
): Promise<T[]> {
  const cands = [...new Set(ambito.map((a) => a.cand))];
  if (cands.length < 2) return buscar(ambito, k);
  const grupos = await Promise.all(
    cands.map((c) =>
      buscar(
        ambito.filter((a) => a.cand === c),
        kPorCand,
      ),
    ),
  );
  return grupos.flat();
}

export async function buscarFragmentos(
  db: Db,
  {
    consulta,
    embedding,
    ambito,
    k = 8,
    kPorCand = 3,
  }: {
    consulta: string;
    embedding: number[] | null;
    ambito: Ambito;
    k?: number;
    kPorCand?: number;
  },
): Promise<FragmentoEncontrado[]> {
  return porCandidatura(ambito, k, kPorCand, async (amb, n) => {
    const ids = (await idsHibridos(db, "fragmentos", consulta, embedding, amb)).slice(0, n);
    if (!ids.length) return [];
    const filas = await db.query<FragmentoEncontrado>(
      "select id, conv, cand, pagina, etiqueta, seccion, texto from fragmentos where id = any($1::text[])",
      [ids],
    );
    const porId = new Map(filas.map((f) => [f.id, f]));
    return ids.map((id) => porId.get(id)!).filter(Boolean);
  });
}

export async function buscarPropuestas(
  db: Db,
  {
    consulta,
    embedding,
    ambito,
    k = 10,
    kPorCand = 4,
  }: {
    consulta: string;
    embedding: number[] | null;
    ambito: Ambito;
    k?: number;
    kPorCand?: number;
  },
): Promise<PropuestaEncontrada[]> {
  return porCandidatura(ambito, k, kPorCand, async (amb, n) => {
    const ids = (await idsHibridos(db, "propuestas", consulta, embedding, amb)).slice(0, n);
    if (!ids.length) return [];
    const filas = await db.query<PropuestaEncontrada>(
      "select id, conv, cand, tema, subtema, tipo, texto, citas from propuestas where id = any($1::text[])",
      [ids],
    );
    const porId = new Map(filas.map((f) => [f.id, f]));
    return ids.map((id) => porId.get(id)!).filter(Boolean);
  });
}

export { plegar };
