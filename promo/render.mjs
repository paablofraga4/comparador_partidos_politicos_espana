// Renderiza los dos formatos del vídeo a out/ (H.264, alta calidad, sin audio).
//   node render.mjs                              → URL por defecto (Root.tsx)
//   node render.mjs https://votoclaro.ejemplo    → otra URL en el cierre
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

mkdirSync("out", { recursive: true });
const url = process.argv[2];
let props = "";
if (url) {
  // Las props van en un archivo: así no hay que escapar JSON en la línea de comandos de Windows
  writeFileSync("out/props.json", JSON.stringify({ url: url.replace(/^https?:\/\//, "") }));
  props = " --props=out/props.json";
}

for (const [id, archivo] of [
  ["PromoHorizontal", "out/votoclaro-promo-16x9.mp4"],
  ["PromoVertical", "out/votoclaro-promo-9x16.mp4"],
]) {
  console.log(`▶ ${id}`);
  execSync(`npx remotion render src/index.ts ${id} ${archivo} --codec=h264 --crf=18${props}`, {
    stdio: "inherit",
  });
}
