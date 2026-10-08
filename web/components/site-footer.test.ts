import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AUTOR } from "@/lib/autor";

import { SiteFooter } from "./site-footer";

describe("pie (spec 005, HU-5.1)", () => {
  it("termina con el copyright y el nombre del autor enlazado a su LinkedIn", () => {
    const html = renderToStaticMarkup(createElement(SiteFooter));
    expect(html).toContain("© 2026");
    expect(html).toContain(`href="${AUTOR.linkedin}"`);
    expect(html).toContain(AUTOR.nombre);
    // «LinkedIn» se ve (antes solo existía para lectores de pantalla y no se encontraba)
    expect(html).toMatch(/>LinkedIn<\/a>/);
    expect(html).toContain('href="/apoya"');
    expect(AUTOR.linkedin).toMatch(/^https:\/\/www\.linkedin\.com\/in\//);
  });
});
