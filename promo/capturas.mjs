// Capturas reales de VotoClaro para el vídeo promocional (escritorio 2× y móvil 3×).
//   node capturas.mjs            → contra producción
//   VC_URL=http://localhost:3000 node capturas.mjs
// Guarda PNG en public/capturas/ y las posiciones de los elementos en src/posiciones.json,
// para que las animaciones (cursor, zoom) apunten a sitios reales.
// Neutralidad: todos los partidos, en el orden alfabético de la propia web; la cita que se
// abre es la del primer partido de la lista.
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("../web/node_modules/playwright");

const BASE = process.env.VC_URL ?? "https://comparadorpartidospoliticosespana-production.up.railway.app";
const PARTIDOS = "bildu,bng,cc,erc,junts,pnv,pp,psoe,sumar,upn,vox";
const PREGUNTA = "¿Qué proponen para la jornada laboral?";
const OUT = new URL("./public/capturas/", import.meta.url);
mkdirSync(OUT, { recursive: true });

const FORMATOS = {
  escritorio: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 },
  movil: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
};

const caja = async (loc) => {
  const b = await loc.boundingBox();
  return b && { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) };
};

async function capturar(nombre, opciones) {
  // Edge del sistema (mismo motor que Chromium): no hace falta descargar navegadores
  const browser = await chromium.launch({ channel: process.env.VC_NAVEGADOR ?? "msedge" });
  const ctx = await browser.newContext({ ...opciones, locale: "es-ES", colorScheme: "light", reducedMotion: "reduce" });
  const page = await ctx.newPage();
  const pos = { viewport: opciones.viewport };
  const foto = async (n) => {
    await page.waitForTimeout(400);
    await page.screenshot({ path: fileURLToPath(new URL(`${nombre}-${n}.png`, OUT)) });
    console.log(`✓ ${nombre}-${n}`);
  };

  // 1. Inicio
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await foto("inicio");

  // 2. Comparar vivienda, todos los partidos
  await page.goto(`${BASE}/comparar?partidos=${PARTIDOS}&temas=vivienda`, { waitUntil: "networkidle" });
  const cita = page.locator('button[aria-label^="Fuente:"]').first();
  await cita.scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, -window.innerHeight * 0.3));
  pos.cita = await caja(cita);
  pos.interruptor = await caja(page.getByRole("switch").first());
  await foto("comparar");

  // 3. Lectura fácil (misma vista)
  await page.getByRole("switch").first().click();
  await page.waitForTimeout(300);
  await foto("facil");
  await page.getByRole("switch").first().click();

  // 4. Panel de fuente: página del PDF con el fragmento resaltado
  await cita.click();
  await page.waitForSelector('[role="dialog"] canvas', { timeout: 30_000 });
  await page.waitForTimeout(3000);
  pos.panel = await caja(page.locator('[role="dialog"]'));
  await foto("fuente");
  await page.keyboard.press("Escape");

  // 5. Chat: una pregunta real (responde con todos los partidos, en orden alfabético)
  await page.goto(`${BASE}/pregunta`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: PREGUNTA }).click();
  await page.getByRole("button", { name: "Detener" }).waitFor({ state: "detached", timeout: 90_000 });
  await page.waitForTimeout(1500);
  const respuesta = page.locator("ol > li").nth(1);
  await page.locator("ol > li").first().scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, -80));
  pos.respuesta = await caja(respuesta);
  await foto("chat");

  await browser.close();
  return pos;
}

const posiciones = {};
for (const [nombre, opciones] of Object.entries(FORMATOS)) {
  posiciones[nombre] = await capturar(nombre, opciones);
}
writeFileSync(new URL("./src/posiciones.json", import.meta.url), JSON.stringify(posiciones, null, 2) + "\n");
console.log("✓ posiciones guardadas");
