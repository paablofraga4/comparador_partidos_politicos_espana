import { describe, expect, it } from "vitest";

import { urlDelSitio } from "./sitio";

describe("urlDelSitio", () => {
  it("acepta la URL completa", () => {
    expect(urlDelSitio("https://votoclaro.es").href).toBe("https://votoclaro.es/");
  });

  it("añade https:// si falta el protocolo", () => {
    expect(urlDelSitio(" algo-production.up.railway.app ").href).toBe(
      "https://algo-production.up.railway.app/",
    );
  });

  it("usa localhost si no hay valor o no es válido", () => {
    expect(urlDelSitio(undefined).href).toBe("http://localhost:3000/");
    expect(urlDelSitio("").href).toBe("http://localhost:3000/");
    expect(urlDelSitio("https://").href).toBe("http://localhost:3000/");
  });
});
