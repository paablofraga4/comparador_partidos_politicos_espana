import { readFile } from "node:fs/promises";
import path from "node:path";

import { ImageResponse } from "next/og";

import { IMAGEN_COMPARTIR } from "@/lib/seo";

// Imagen única y de marca para compartir (spec 002, HU-2.9): sin partidos, para no favorecer
// a ninguno. Estética «editorial cívico»: papel, tinta y el subrayado de rotulador.
export const alt = IMAGEN_COMPARTIR.alt;
export const size = { width: IMAGEN_COMPARTIR.width, height: IMAGEN_COMPARTIR.height };
export const contentType = "image/png";

const fuente = (f: string) => readFile(path.join(process.cwd(), "assets", "fonts", f));

export default async function Imagen() {
  const [serif, sans, sansBold] = await Promise.all([
    fuente("newsreader-500.woff"),
    fuente("public-sans-500.woff"),
    fuente("public-sans-600.woff"),
  ]);
  const rotulador = {
    backgroundColor: "#FFE45C",
    height: 26,
    position: "absolute" as const,
    left: -6,
    right: -6,
    bottom: 10,
  };
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "64px 80px",
        background: "#FAF8F3",
        color: "#16181D",
        fontFamily: "Public Sans",
      }}
    >
      <div style={{ display: "flex", fontFamily: "Newsreader", fontSize: 56 }}>
        Voto
        <div style={{ display: "flex", position: "relative" }}>
          <div style={{ ...rotulador, height: 18, bottom: 8 }} />
          <span style={{ position: "relative" }}>Claro</span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            fontFamily: "Newsreader",
            fontSize: 92,
            lineHeight: 1.05,
          }}
        >
          <span>¿Qué propone&nbsp;</span>
          <div style={{ display: "flex", position: "relative" }}>
            <div style={rotulador} />
            <span style={{ position: "relative" }}>cada partido</span>
          </div>
          <span>?</span>
        </div>
        <div style={{ display: "flex", marginTop: 28, fontSize: 34, color: "#5B6170" }}>
          Compara los programas del 29N con la fuente a un clic.
        </div>
      </div>
      <div style={{ display: "flex", fontSize: 24, fontWeight: 600, color: "#5B6170" }}>
        Independiente · Sin anuncios · Todos los partidos, en orden alfabético
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: "Newsreader", data: serif, weight: 500, style: "normal" },
        { name: "Public Sans", data: sans, weight: 500, style: "normal" },
        { name: "Public Sans", data: sansBold, weight: 600, style: "normal" },
      ],
    },
  );
}
