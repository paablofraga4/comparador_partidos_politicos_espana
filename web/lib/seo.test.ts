import { describe, expect, it } from "vitest";

import { metaPagina, nombrePartido } from "./seo";

describe("seo", () => {
  it("nombre del partido sin depender del artículo", () => {
    expect(nombrePartido({ corto: "PP", nombre: "Partido Popular" })).toBe("PP (Partido Popular)");
    expect(nombrePartido({ corto: "Sumar", nombre: "Sumar" })).toBe("Sumar");
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
