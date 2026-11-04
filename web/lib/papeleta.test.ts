import { readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { describe, expect, it } from "vitest";

import { DIPUTADOS_POR_ID } from "./elecciones";
import { enProvincia, etiquetaPapeleta, type CandidaturaPapeleta } from "./papeleta";

const c = (id: string, corto: string, listas: Record<string, string>): CandidaturaPapeleta => ({
  id,
  corto,
  nombre: corto,
  color: "#000",
  listas,
  programa: "pendiente",
});

describe("diputados por circunscripción", () => {
  it("cada circunscripción del BOE tiene su cifra del decreto, y suman 350", () => {
    const f = path.resolve(__dirname, "..", "..", "data", "circunscripciones.yaml");
    const ids = (
      parse(readFileSync(f, "utf8")) as { circunscripciones: { id: string }[] }
    ).circunscripciones.map((x) => x.id);
    expect(ids).toHaveLength(52);
    for (const id of ids) expect(DIPUTADOS_POR_ID[id], id).toBeGreaterThan(0);
    expect(Object.keys(DIPUTADOS_POR_ID).sort()).toEqual([...ids].sort());
    expect(Object.values(DIPUTADOS_POR_ID).reduce((s, n) => s + n, 0)).toBe(350);
    expect(DIPUTADOS_POR_ID.madrid).toBe(38);
    expect(DIPUTADOS_POR_ID["illes-balears"]).toBe(8);
  });
});

describe("papeleta de una provincia", () => {
  it("solo las candidaturas de esa provincia, en orden alfabético", () => {
    const todas = [
      c("vox", "VOX", { madrid: "VOX", soria: "VOX" }),
      c("bng", "BNG", { "a-coruna": "BNG" }),
      c("pp", "PP", { madrid: "PP" }),
      c("alhora", "ALHORA", { madrid: "ALHORA" }),
    ];
    expect(enProvincia(todas, "madrid").map((x) => x.id)).toEqual(["alhora", "pp", "vox"]);
    expect(enProvincia(todas, "a-coruna").map((x) => x.id)).toEqual(["bng"]);
  });

  it("la etiqueta del programa nombra a la coalición anterior si procede", () => {
    expect(etiquetaPapeleta({ programa: "2023", programaDe: "Sumar" })).toBe(
      "Programa de 2023 de Sumar (coalición anterior)",
    );
    expect(etiquetaPapeleta({ programa: "pendiente" })).toBe("Sin programa publicado");
  });
});
