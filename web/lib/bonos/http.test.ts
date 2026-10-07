import { describe, expect, it } from "vitest";

import { ipCliente } from "./http";

const peticion = (cabeceras: Record<string, string>) =>
  new Request("https://votoclaro.app/api/chat", { headers: cabeceras });

describe("ipCliente", () => {
  it("detrás de Cloudflare usa cf-connecting-ip aunque el cliente invente x-forwarded-for", () => {
    const req = peticion({
      "cf-connecting-ip": "203.0.113.7",
      "x-forwarded-for": "1.1.1.1, 203.0.113.7",
    });
    expect(ipCliente(req)).toBe("203.0.113.7");
  });

  it("sin Cloudflare, el primer valor de x-forwarded-for", () => {
    expect(ipCliente(peticion({ "x-forwarded-for": "198.51.100.2, 10.0.0.1" }))).toBe(
      "198.51.100.2",
    );
    expect(ipCliente(peticion({}))).toBe("local");
  });
});
