import { describe, expect, it } from "vitest";
import { refCita, refFragmento, segmentar, sinMarcaIncompleta, type FuenteChat } from "./refs";

const f = (ref: string): FuenteChat => ({
  ref,
  tipo: "cita",
  conv: "generales-2023",
  cand: "pp",
  id: "c0001",
  pagina: "4",
  candCorto: "PP",
  convCorto: "2023",
});

describe("refs del chat (spec 003, HU-3.2)", () => {
  it("construye refs cortas y estables, también con ids de candidatura con guiones", () => {
    expect(refCita("pp", "generales-2023", "c0012")).toBe("pp23:c0012");
    expect(refFragmento("mas-madrid", "generales-2026", "mas-madrid-26-p047-02")).toBe(
      "mas-madrid26:p047-02",
    );
  });

  it("solo deja las citas que están en el registro del turno", () => {
    const reg = new Map([["pp23:c0012", f("pp23:c0012")]]);
    const { segmentos, descartadas } = segmentar(
      "El PP propone X [[pp23:c0012]]. Y algo inventado [[vox23:c9999]].",
      reg,
    );
    expect(descartadas).toBe(1);
    expect(segmentos.filter((s) => s.tipo === "citas")).toHaveLength(1);
    expect(segmentos.map((s) => (s.tipo === "texto" ? s.valor : "#")).join("")).toBe(
      "El PP propone X #. Y algo inventado .",
    );
  });

  it("acepta varias refs en una marca y rechaza basura o inyecciones", () => {
    const reg = new Map([
      ["pp23:c0001", f("pp23:c0001")],
      ["pp23:c0002", f("pp23:c0002")],
    ]);
    const r = segmentar("A [[pp23:c0001, pp23:c0002]] B [[<script>]] C", reg);
    const citas = r.segmentos.find((s) => s.tipo === "citas");
    expect(citas && citas.tipo === "citas" && citas.fuentes).toHaveLength(2);
    expect(r.descartadas).toBe(1);
  });

  it("oculta una marca a medio escribir durante el streaming", () => {
    expect(sinMarcaIncompleta("Propone bajar el IVA [[pp23:c00")).toBe("Propone bajar el IVA ");
    expect(sinMarcaIncompleta("Hecho [[pp23:c0001]] y más")).toBe("Hecho [[pp23:c0001]] y más");
  });
});
