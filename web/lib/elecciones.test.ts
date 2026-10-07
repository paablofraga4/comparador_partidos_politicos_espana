import { describe, expect, it } from "vitest";

import { DIPUTADOS, TOTAL_DIPUTADOS } from "./elecciones";

describe("anexo del Real Decreto 806/2026", () => {
  it("52 circunscripciones y 350 diputados", () => {
    expect(DIPUTADOS).toHaveLength(52);
    expect(TOTAL_DIPUTADOS).toBe(350);
    expect(Object.fromEntries(DIPUTADOS)).toMatchObject({ Madrid: 38, Barcelona: 32, Soria: 2 });
  });
});
