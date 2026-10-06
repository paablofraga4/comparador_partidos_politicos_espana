/**
 * Índices del chat (spec 001 «RAG agéntico híbrido y simétrico», plan técnico D7):
 *  - fragmentos: texto completo de los programas con cabecera contextual
 *  - propuestas: resúmenes y propuestas ya verificados (índice curado)
 * Sincronización incremental por hash y embeddings solo de lo nuevo.
 */
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "yaml";

import type { Db } from "./db";
import { vec } from "./db";
import { plegar } from "./texto";
import type { Analisis, Candidatura, Tema } from "./types";
import { CONVOCATORIAS, type ConvocatoriaId } from "./types";

export type FilaFragmento = {
  id: string;
  conv: string;
  cand: string;
  pagina: number;
  etiqueta: string | null;
  seccion: string;
  texto: string;
  contexto: string;
  rect: [number, number, number, number] | null;
  hash: string;
};

export type FilaPropuesta = {
  id: string;
  conv: string;
  cand: string;
  tema: string;
  subtema: string;
  tipo: "propuesta" | "resumen";
  texto: string;
  contexto: string;
  citas: { cid: string; pagina: number; pagina_impresa: string | null }[];
  hash: string;
};

const subcarpetas = (dir: string) =>
  readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

const sha = (s: string) => createHash("sha1").update(s).digest("hex").slice(0, 16);

function jsonl<T>(p: string): T[] {
  return readFileSync(p, "utf8")
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as T);
}

/** Fragmentos de todos los documentos extraídos (ambas convocatorias). */
export function filasFragmentos(dataDir: string): FilaFragmento[] {
  const base = path.join(dataDir, "extracted");
  if (!existsSync(base)) return [];
  const filas: FilaFragmento[] = [];
  for (const conv of subcarpetas(base)) {
    const dir = path.join(base, conv);
    for (const f of readdirSync(dir).filter((x) => x.endsWith(".chunks.jsonl"))) {
      const cand = f.replace(".chunks.jsonl", "");
      const paginas = new Map(
        jsonl<{ pagina: number; ancho: number; alto: number }>(
          path.join(dir, `${cand}.pages.jsonl`),
        ).map((p) => [p.pagina, p]),
      );
      for (const c of jsonl<{
        id: string;
        pagina: number;
        etiqueta?: string | null;
        seccion: string[];
        bbox: [number, number, number, number];
        texto: string;
        contexto: string;
        hash: string;
      }>(path.join(dir, f))) {
        const p = paginas.get(c.pagina);
        const rect: FilaFragmento["rect"] = p
          ? ([c.bbox[0] / p.ancho, c.bbox[1] / p.alto, c.bbox[2] / p.ancho, c.bbox[3] / p.alto].map(
              (v) => Math.round(Math.min(Math.max(v, 0), 1) * 10000) / 10000,
            ) as FilaFragmento["rect"])
          : null;
        filas.push({
          id: c.id,
          conv,
          cand,
          pagina: c.pagina,
          etiqueta: c.etiqueta ?? null,
          seccion: (c.seccion ?? []).join(" > "),
          texto: c.texto,
          contexto: c.contexto,
          rect,
          hash: c.hash,
        });
      }
    }
  }
  return filas;
}

/** Propuestas y frases de resumen de los análisis publicables (aprobados o, en vista previa, borradores). */
export function filasPropuestas(
  dataDir: string,
  opts: { mostrarBorradores: boolean },
): FilaPropuesta[] {
  const cands = new Map(
    (
      parse(readFileSync(path.join(dataDir, "candidaturas.yaml"), "utf8")) as {
        candidaturas: Candidatura[];
      }
    ).candidaturas.map((c) => [c.id, c]),
  );
  const temas = new Map(
    (parse(readFileSync(path.join(dataDir, "topics.yaml"), "utf8")) as { temas: Tema[] }).temas.map(
      (t) => [t.id, t],
    ),
  );
  const base = path.join(dataDir, "analyses");
  if (!existsSync(base)) return [];
  const filas: FilaPropuesta[] = [];
  for (const conv of subcarpetas(base)) {
    for (const f of readdirSync(path.join(base, conv)).filter((x) => x.endsWith(".json"))) {
      const a = JSON.parse(readFileSync(path.join(base, conv, f), "utf8")) as Analisis;
      if (a.estado !== "aprobado" && !opts.mostrarBorradores) continue;
      const c = cands.get(a.candidatura);
      const convNombre = CONVOCATORIAS[conv as ConvocatoriaId]?.nombre ?? conv;
      for (const [tid, t] of Object.entries(a.temas)) {
        if (!t.menciona) continue;
        const temaNombre = temas.get(tid)?.nombre ?? tid;
        const citas = (ids: string[]) =>
          ids.map((cid) => ({
            cid,
            pagina: a.citas[cid]?.pagina ?? 0,
            pagina_impresa: a.citas[cid]?.pagina_impresa ?? null,
          }));
        const items: Omit<FilaPropuesta, "hash" | "contexto">[] = [
          ...(t.resumen ?? []).map((r, i) => ({
            id: `${conv}:${a.candidatura}:${tid}:r${i + 1}`,
            conv,
            cand: a.candidatura,
            tema: tid,
            subtema: "",
            tipo: "resumen" as const,
            texto: r.texto,
            citas: citas(r.citas),
          })),
          ...(t.propuestas ?? []).map((p) => ({
            id: `${conv}:${a.candidatura}:${p.id}`,
            conv,
            cand: a.candidatura,
            tema: tid,
            subtema: p.subtema,
            tipo: "propuesta" as const,
            texto: p.texto,
            citas: citas(p.citas),
          })),
        ];
        for (const it of items) {
          const contexto = [c?.nombre ?? it.cand, convNombre, temaNombre, it.subtema]
            .filter(Boolean)
            .join(" · ");
          filas.push({ ...it, contexto, hash: sha(`${contexto}\n${it.texto}`) });
        }
      }
    }
  }
  return filas;
}

// --- Base de datos -------------------------------------------------------------------------

export async function migrar(db: Db, dir: string): Promise<string[]> {
  await db.exec(
    "create table if not exists migraciones (nombre text primary key, aplicada timestamptz not null default now())",
  );
  const hechas = new Set(
    (await db.query<{ nombre: string }>("select nombre from migraciones")).map((r) => r.nombre),
  );
  const aplicadas: string[] = [];
  for (const f of readdirSync(dir)
    .filter((x) => x.endsWith(".sql"))
    .sort()) {
    if (hechas.has(f)) continue;
    await db.exec(readFileSync(path.join(dir, f), "utf8"));
    await db.query("insert into migraciones (nombre) values ($1)", [f]);
    aplicadas.push(f);
  }
  return aplicadas;
}

type Resumen = { nuevas: number; actualizadas: number; borradas: number };

async function diferencias<F extends { id: string; hash: string }>(
  db: Db,
  tabla: string,
  filas: F[],
) {
  const actuales = new Map(
    (await db.query<{ id: string; hash: string }>(`select id, hash from ${tabla}`)).map((r) => [
      r.id,
      r.hash,
    ]),
  );
  const cambiadas = filas.filter((f) => actuales.get(f.id) !== f.hash);
  const ids = new Set(filas.map((f) => f.id));
  const sobran = [...actuales.keys()].filter((id) => !ids.has(id));
  return { actuales, cambiadas, sobran };
}

export async function sincronizarFragmentos(db: Db, filas: FilaFragmento[]): Promise<Resumen> {
  const { actuales, cambiadas, sobran } = await diferencias(db, "fragmentos", filas);
  for (const f of cambiadas) {
    await db.query(
      `insert into fragmentos (id, conv, cand, pagina, etiqueta, seccion, texto, contexto, rect, busqueda, hash, embedding)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb, to_tsvector('spanish', $10), $11, null)
       on conflict (id) do update set conv=excluded.conv, cand=excluded.cand, pagina=excluded.pagina,
         etiqueta=excluded.etiqueta, seccion=excluded.seccion, texto=excluded.texto,
         contexto=excluded.contexto, rect=excluded.rect, busqueda=excluded.busqueda,
         hash=excluded.hash, embedding=null`,
      [
        f.id,
        f.conv,
        f.cand,
        f.pagina,
        f.etiqueta,
        f.seccion,
        f.texto,
        f.contexto,
        JSON.stringify(f.rect),
        plegar(`${f.contexto}\n${f.texto}`),
        f.hash,
      ],
    );
  }
  if (sobran.length) await db.query("delete from fragmentos where id = any($1)", [sobran]);
  const nuevas = cambiadas.filter((f) => !actuales.has(f.id)).length;
  return { nuevas, actualizadas: cambiadas.length - nuevas, borradas: sobran.length };
}

export async function sincronizarPropuestas(db: Db, filas: FilaPropuesta[]): Promise<Resumen> {
  const { actuales, cambiadas, sobran } = await diferencias(db, "propuestas", filas);
  for (const f of cambiadas) {
    await db.query(
      `insert into propuestas (id, conv, cand, tema, subtema, tipo, texto, contexto, citas, busqueda, hash, embedding)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb, to_tsvector('spanish', $10), $11, null)
       on conflict (id) do update set conv=excluded.conv, cand=excluded.cand, tema=excluded.tema,
         subtema=excluded.subtema, tipo=excluded.tipo, texto=excluded.texto,
         contexto=excluded.contexto, citas=excluded.citas, busqueda=excluded.busqueda,
         hash=excluded.hash, embedding=null`,
      [
        f.id,
        f.conv,
        f.cand,
        f.tema,
        f.subtema,
        f.tipo,
        f.texto,
        f.contexto,
        JSON.stringify(f.citas),
        plegar(`${f.contexto}\n${f.texto}`),
        f.hash,
      ],
    );
  }
  if (sobran.length) await db.query("delete from propuestas where id = any($1)", [sobran]);
  const nuevas = cambiadas.filter((f) => !actuales.has(f.id)).length;
  return { nuevas, actualizadas: cambiadas.length - nuevas, borradas: sobran.length };
}

export type Embedder = (textos: string[]) => Promise<{ embeddings: number[][]; tokens: number }>;

/** Calcula los embeddings que faltan (filas nuevas o cambiadas), por lotes. */
export async function embeberPendientes(
  db: Db,
  tabla: "fragmentos" | "propuestas",
  embed: Embedder,
  lote = 96,
): Promise<{ filas: number; tokens: number }> {
  let filas = 0;
  let tokens = 0;
  for (;;) {
    const pendientes = await db.query<{ id: string; contexto: string; texto: string }>(
      `select id, contexto, texto from ${tabla} where embedding is null order by id limit $1`,
      [lote],
    );
    if (!pendientes.length) break;
    const r = await embed(pendientes.map((p) => `${p.contexto}\n${p.texto}`));
    for (let i = 0; i < pendientes.length; i++) {
      await db.query(`update ${tabla} set embedding = $1::vector where id = $2`, [
        vec(r.embeddings[i]),
        pendientes[i].id,
      ]);
    }
    filas += pendientes.length;
    tokens += r.tokens;
  }
  return { filas, tokens };
}
