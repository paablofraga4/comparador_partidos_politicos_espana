import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { buscarFragmentos, buscarPropuestas, rrf } from "./busqueda";
import { getDb, type Db } from "./db";
import {
  embeberPendientes,
  filasFragmentos,
  filasPropuestas,
  migrar,
  sincronizarFragmentos,
  sincronizarPropuestas,
  type Embedder,
} from "./indice";

const MIGRACIONES = path.resolve(__dirname, "..", "db", "migraciones");

// Embeddings de juguete: bolsa de palabras proyectada a 1536 dimensiones (determinista)
const fakeEmbed: Embedder = async (textos) => ({
  tokens: textos.join(" ").length,
  embeddings: textos.map((t) => {
    const v = new Array(1536).fill(0);
    for (const w of t.toLowerCase().split(/\W+/).filter(Boolean)) {
      let h = 0;
      for (const ch of w) h = (h * 31 + ch.charCodeAt(0)) % 1536;
      v[h] += 1;
    }
    v[0] += 0.001;
    return v;
  }),
});

function chunk(cand: string, id: string, pagina: number, texto: string) {
  return JSON.stringify({
    id,
    convocatoria: "generales-2023",
    candidatura: cand,
    pagina,
    seccion: ["Vivienda"],
    bbox: [50, 100, 550, 200],
    texto,
    contexto: `${cand.toUpperCase()} · Generales 23J-2023 · Vivienda · p. ${pagina}`,
    hash: `${id}-h1`,
  });
}

let dir: string;
let db: Db;

beforeAll(async () => {
  dir = mkdtempSync(path.join(tmpdir(), "vc-data-"));
  const ext = path.join(dir, "extracted", "generales-2023");
  mkdirSync(ext, { recursive: true });
  for (const cand of ["aa", "bb"]) {
    writeFileSync(
      path.join(ext, `${cand}.pages.jsonl`),
      JSON.stringify({ pagina: 1, ancho: 600, alto: 800 }) + "\n",
    );
  }
  // «aa» tiene un programa largo con muchos fragmentos sobre vivienda; «bb», uno solo.
  writeFileSync(
    path.join(ext, "aa.chunks.jsonl"),
    Array.from({ length: 12 }, (_, i) =>
      chunk(
        "aa",
        `aa-23-p001-${String(i + 1).padStart(2, "0")}`,
        1,
        `Construiremos viviendas en alquiler número ${i}`,
      ),
    ).join("\n") + "\n",
  );
  writeFileSync(
    path.join(ext, "bb.chunks.jsonl"),
    chunk("bb", "bb-23-p001-01", 1, "Limitaremos el precio del alquiler de vivienda") + "\n",
  );
  writeFileSync(
    path.join(dir, "candidaturas.yaml"),
    "version: 2\nfase_inclusion: provisional\ncandidaturas:\n  - {id: aa, nombre: Partido A, corto: AA, tipo: partido, ambito: estatal, color: '#000000', web: x, convocatorias: {}}\n",
  );
  writeFileSync(
    path.join(dir, "topics.yaml"),
    "version: 1\ntemas:\n  - {id: vivienda, nombre: Vivienda, icono: house, descripcion: x, subtemas: [alquiler]}\n",
  );
  const an = path.join(dir, "analyses", "generales-2023");
  mkdirSync(an, { recursive: true });
  const analisis = (estado: string) => ({
    convocatoria: "generales-2023",
    candidatura: "aa",
    estado,
    temas: {
      vivienda: {
        menciona: true,
        resumen: [{ texto: "Propone ampliar el alquiler social.", citas: ["c0001"] }],
        propuestas: [
          {
            id: "vivienda-1",
            subtema: "alquiler",
            texto: "Bajar el IVA del alquiler.",
            citas: ["c0001"],
          },
        ],
      },
    },
    citas: { c0001: { pagina: 1, pagina_impresa: "1" } },
  });
  writeFileSync(path.join(an, "aa.json"), JSON.stringify(analisis("borrador")));
  db = await getDb("pglite:memory");
  await migrar(db, MIGRACIONES);
});

afterAll(async () => {
  await db?.end();
});

describe("índice del chat sobre PGlite", () => {
  it("las migraciones son idempotentes", async () => {
    expect(await migrar(db, MIGRACIONES)).toEqual([]);
  });

  it("normaliza la caja del fragmento para poder resaltarlo", () => {
    const f = filasFragmentos(dir).find((x) => x.id === "bb-23-p001-01")!;
    expect(f.rect).toEqual([0.0833, 0.125, 0.9167, 0.25]);
  });

  it("solo indexa borradores en vista previa", () => {
    expect(filasPropuestas(dir, { mostrarBorradores: false })).toHaveLength(0);
    expect(filasPropuestas(dir, { mostrarBorradores: true })).toHaveLength(2);
  });

  it("sincroniza de forma incremental y embebe solo lo pendiente", async () => {
    const filas = filasFragmentos(dir);
    expect(await sincronizarFragmentos(db, filas)).toEqual({
      nuevas: 13,
      actualizadas: 0,
      borradas: 0,
    });
    expect((await embeberPendientes(db, "fragmentos", fakeEmbed)).filas).toBe(13);
    // Sin cambios: no toca nada ni vuelve a embeber
    expect(await sincronizarFragmentos(db, filas)).toEqual({
      nuevas: 0,
      actualizadas: 0,
      borradas: 0,
    });
    expect((await embeberPendientes(db, "fragmentos", fakeEmbed)).filas).toBe(0);
    // Un cambio y un borrado
    const cambiadas = filas
      .filter((f) => f.id !== "aa-23-p001-12")
      .map((f) => (f.id === "aa-23-p001-01" ? { ...f, hash: "nuevo" } : f));
    expect(await sincronizarFragmentos(db, cambiadas)).toEqual({
      nuevas: 0,
      actualizadas: 1,
      borradas: 1,
    });
    expect((await embeberPendientes(db, "fragmentos", fakeEmbed)).filas).toBe(1);
    await sincronizarFragmentos(db, filas);
    await embeberPendientes(db, "fragmentos", fakeEmbed);
  });

  it("la búsqueda es simétrica: el programa corto no queda ahogado por el largo", async () => {
    const [emb] = (await fakeEmbed(["precio del alquiler de vivienda"])).embeddings;
    const ambito = [
      { cand: "aa", conv: "generales-2023" },
      { cand: "bb", conv: "generales-2023" },
    ];
    const r = await buscarFragmentos(db, {
      consulta: "alquiler vivienda",
      embedding: emb,
      ambito,
      kPorCand: 3,
    });
    const porCand = (c: string) => r.filter((x) => x.cand === c).length;
    expect(porCand("aa")).toBe(3);
    expect(porCand("bb")).toBe(1);
    // Una sola candidatura: no se mezclan resultados de otras
    const solo = await buscarFragmentos(db, {
      consulta: "alquiler",
      embedding: null,
      ambito: [ambito[1]],
    });
    expect(solo.every((x) => x.cand === "bb")).toBe(true);
  });

  it("encuentra propuestas sin tildes y sin embeddings (degradación elegante)", async () => {
    await sincronizarPropuestas(db, filasPropuestas(dir, { mostrarBorradores: true }));
    const r = await buscarPropuestas(db, {
      consulta: "iva alquiler",
      embedding: null,
      ambito: [{ cand: "aa", conv: "generales-2023" }],
    });
    expect(r[0]?.id).toBe("generales-2023:aa:vivienda-1");
    expect(r[0]?.citas[0].cid).toBe("c0001");
  });

  it("RRF premia lo que aparece arriba en ambas listas", () => {
    expect(
      rrf([
        ["a", "b", "c"],
        ["b", "a"],
      ])[0],
    ).toMatch(/a|b/);
    expect(rrf([["x"], ["y", "x"]])[0]).toBe("x");
  });
});
