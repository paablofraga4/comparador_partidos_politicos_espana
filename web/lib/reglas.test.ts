import { describe, expect, it } from "vitest";
import { candidaturasVisibles, limpiarLiteral, ordenAlfabetico, programaVigente } from "./reglas";
import type { Analisis, Candidatura, RegistroCandidaturas } from "./types";

const cand = (over: Partial<Candidatura> = {}): Candidatura => ({
  id: "pp",
  nombre: "Partido Popular",
  corto: "PP",
  tipo: "partido",
  ambito: "estatal",
  color: "#1D84CE",
  web: "https://www.pp.es/",
  incluir: "siempre",
  convocatorias: {
    "generales-2023": { programa_propio: true },
    "generales-2026": { estado: "provisional" },
  },
  ...over,
});

const analisis = (conv: string, estado: "borrador" | "aprobado"): Analisis =>
  ({ convocatoria: conv, candidatura: "pp", estado, temas: {}, citas: {} }) as unknown as Analisis;

describe("programaVigente (spec 001, HU-1.7)", () => {
  const prod = { mostrarBorradores: false };

  it("muestra el 29N cuando está aprobado", () => {
    const v = programaVigente(
      cand(),
      {
        "generales-2026": analisis("generales-2026", "aprobado"),
        "generales-2023": analisis("generales-2023", "aprobado"),
      },
      {},
      prod,
    );
    expect(v).toMatchObject({ tipo: "programa", convocatoria: "generales-2026", anterior: false });
  });

  it("si el 29N está en borrador, cae a 2023 marcado como anterior", () => {
    const v = programaVigente(
      cand(),
      {
        "generales-2026": analisis("generales-2026", "borrador"),
        "generales-2023": analisis("generales-2023", "aprobado"),
      },
      {},
      prod,
    );
    expect(v).toMatchObject({ tipo: "programa", convocatoria: "generales-2023", anterior: true });
  });

  it("NO asigna el programa de una coalición ajena (Podemos dentro de Sumar)", () => {
    const podemos = cand({
      id: "podemos",
      corto: "Podemos",
      convocatorias: { "generales-2023": { programa_propio: false, dentro_de: "sumar" } },
    });
    const v = programaVigente(
      podemos,
      { "generales-2023": analisis("generales-2023", "aprobado") },
      {},
      prod,
    );
    expect(v).toEqual({ tipo: "pendiente", dentroDe: "sumar" });
  });

  it("nunca muestra borradores en producción y sí en vista previa", () => {
    const a = { "generales-2023": analisis("generales-2023", "borrador") };
    expect(programaVigente(cand(), a, {}, prod).tipo).toBe("pendiente");
    const preview = programaVigente(cand(), a, {}, { mostrarBorradores: true });
    expect(preview).toMatchObject({ tipo: "programa", borrador: true });
  });
});

describe("candidaturasVisibles (constitución I.6)", () => {
  const reg = (fase: RegistroCandidaturas["fase_inclusion"]): RegistroCandidaturas => ({
    version: 2,
    fase_inclusion: fase,
    candidaturas: [
      cand({ id: "vox", corto: "VOX" }),
      cand({ id: "bng", corto: "BNG" }),
      cand({
        id: "mas-madrid",
        corto: "Más Madrid",
        incluir: "si-concurre-por-separado",
        convocatorias: { "generales-2026": { estado: "provisional" } },
      }),
      cand({
        id: "nueva",
        corto: "Nueva",
        incluir: null,
        convocatorias: { "generales-2026": { estado: "presentada" } },
      }),
    ],
  });

  it("fase provisional: las de representación, ordenadas alfabéticamente", () => {
    expect(candidaturasVisibles(reg("provisional")).map((c) => c.id)).toEqual([
      "bng",
      "nueva",
      "vox",
    ]);
  });

  it("fase BOE: todas las presentadas, sin filtro editorial", () => {
    expect(candidaturasVisibles(reg("presentadas")).map((c) => c.id)).toEqual(["nueva"]);
  });
});

describe("utilidades", () => {
  it("orden alfabético ignora mayúsculas y tildes", () => {
    const r = ordenAlfabetico([{ corto: "VOX" }, { corto: "Más Madrid" }, { corto: "BNG" }]);
    expect(r.map((x) => x.corto)).toEqual(["BNG", "Más Madrid", "VOX"]);
  });
  it("limpia guiones de fin de línea solo entre letras", () => {
    expect(limpiarLiteral("la Co- munidad Foral")).toBe("la Comunidad Foral");
    expect(limpiarLiteral("2023- 2027")).toBe("2023- 2027");
  });
});
