import { describe, expect, it } from "vitest";

import { conArticulo, delPartido, metaPagina, nombrePartido, tituloPartidoTema } from "./seo";

describe("seo", () => {
  it("nombre del partido sin depender del artículo", () => {
    expect(nombrePartido({ corto: "PP", nombre: "Partido Popular" })).toBe("PP (Partido Popular)");
    expect(nombrePartido({ corto: "Sumar", nombre: "Sumar" })).toBe("Sumar");
  });

  it("artículo y contracción como en castellano", () => {
    const pp = { corto: "PP", articulo: "el" as const };
    const vox = { corto: "VOX" };
    expect(conArticulo(pp)).toBe("el PP");
    expect(conArticulo(vox)).toBe("VOX");
    expect(delPartido(pp)).toBe("del PP");
    expect(delPartido(vox)).toBe("de VOX");
    expect(delPartido({ corto: "X", articulo: "la" })).toBe("de la X");
  });

  it("título partido × tema: la pregunta como se busca y el número de propuestas", () => {
    const pp = { corto: "PP", articulo: "el" as const };
    expect(tituloPartidoTema({ tema: "Pensiones", c: pp, propuestas: 8, es29N: false })).toBe(
      "Pensiones: qué propone el PP en su programa electoral (8 propuestas)",
    );
    expect(tituloPartidoTema({ tema: "Sanidad", c: { corto: "VOX" }, propuestas: 1, es29N: true })).toBe(
      "Sanidad: qué propone VOX en su programa del 29N (1 propuesta)",
    );
    expect(tituloPartidoTema({ tema: "Sanidad", c: { corto: "VOX" }, propuestas: 0, es29N: false })).toBe(
      "Sanidad: qué propone VOX en su programa electoral",
    );
  });

  it("canónica sin parámetros, la misma imagen en todas y la marca al final", () => {
    const m = metaPagina({ titulo: "Temas", descripcion: "d", ruta: "/temas" });
    expect(m.alternates?.canonical).toBe("/temas");
    expect(m.openGraph?.title).toBe("Temas · VotoClaro");
    expect(JSON.stringify(m.openGraph?.images)).toContain("/opengraph-image");
    expect(metaPagina({ titulo: "Inicio", descripcion: "d", ruta: "/" }).title).toEqual({
      absolute: "Inicio",
    });
  });
});
