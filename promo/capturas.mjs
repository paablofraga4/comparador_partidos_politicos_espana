// Capturas reales de VotoClaro para el vídeo promocional (escritorio 2× y móvil 3×).
//   node capturas.mjs            → contra producción
//   VC_URL=http://localhost:3000 node capturas.mjs
// Guarda PNG en public/capturas/ y las posiciones de los elementos en src/posiciones.json, para
// que las animaciones (cursor, zoom, resaltados, desplazamiento) apunten a sitios reales sin
// coordenadas a mano.
// Partidos: PP, PSOE, Sumar y VOX (las cuatro fuerzas estatales con grupo propio), en el orden
// alfabético de la web; en la fila de selección se siguen viendo todos. Cada contexto nuevo gasta
// 1 de las preguntas gratis del chat.
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("../web/node_modules/playwright");

const BASE = process.env.VC_URL ?? "https://votoclaro.app";
const PARTIDOS = ["pp", "psoe", "sumar", "vox"];
const NOMBRES_CHIP = ["PP", "PSOE", "Sumar", "VOX"];
const PREGUNTA = "¿Qué proponen para la jornada laboral?";
const OUT = new URL("./public/capturas/", import.meta.url);
mkdirSync(OUT, { recursive: true });

const FORMATOS = {
  escritorio: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 },
  movil: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
};

const redondo = (b, dy = 0) =>
  b && { x: Math.round(b.x), y: Math.round(b.y + dy), w: Math.round(b.width), h: Math.round(b.height) };

async function capturar(nombre, opciones) {
  // Edge del sistema (mismo motor que Chromium): no hace falta descargar navegadores
  const browser = await chromium.launch({ channel: process.env.VC_NAVEGADOR ?? "msedge" });
  const ctx = await browser.newContext({ ...opciones, locale: "es-ES", colorScheme: "light", reducedMotion: "reduce" });
  const page = await ctx.newPage();
  const pos = { viewport: opciones.viewport };
  const espera = (ms = 500) => page.waitForTimeout(ms);
  const foto = async (n, extra = {}) => {
    await espera();
    await page.screenshot({ path: fileURLToPath(new URL(`${nombre}-${n}.png`, OUT)), ...extra });
    console.log(`✓ ${nombre}-${n}`);
  };
  /** Caja en px CSS de la ventana; con `pagina`, en coordenadas de la página entera. */
  const caja = async (loc, pagina = false) =>
    redondo(await loc.boundingBox(), pagina ? await page.evaluate(() => window.scrollY) : 0);
  const cabecera = page.locator("header").first();

  // 1. Inicio
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await foto("inicio");

  // 2. Comparar vivienda: el titular del tema justo bajo la cabecera, con las cuatro tarjetas
  await page.goto(`${BASE}/comparar?partidos=${PARTIDOS.join(",")}&temas=vivienda`, {
    waitUntil: "networkidle",
  });
  const altoCabecera = (await caja(cabecera)).h;
  await page.evaluate((top) => {
    const h = document.getElementById("h-vivienda");
    window.scrollTo(0, h.getBoundingClientRect().top + window.scrollY - top);
  }, altoCabecera + 20);
  await espera(300);
  const seccion = page.locator('section[aria-labelledby="h-vivienda"]');
  const carrusel = seccion.locator('[aria-label^="Vivienda:"]');
  const tarjetas = carrusel.locator("article");
  const cita = seccion.locator('button[aria-label^="Fuente:"]').first();
  pos.cita = await caja(cita);
  pos.interruptor = await caja(page.getByRole("switch").first());
  pos.tarjeta = await caja(tarjetas.first());
  await foto("comparar");

  // En móvil las tarjetas son un carrusel: una captura por tarjeta (2…4) para «deslizar»
  const desliza = await carrusel.evaluate((el) => el.scrollWidth > el.clientWidth + 1);
  pos.tarjetas = desliza ? await tarjetas.count() : 1;
  for (let i = 1; i < pos.tarjetas; i++) {
    await tarjetas.nth(i).evaluate((el) => el.scrollIntoView({ inline: "start", block: "nearest" }));
    await espera(400);
    await foto(`comparar-${i + 1}`);
  }
  await carrusel.evaluate((el) => el.scrollTo({ left: 0 }));
  await espera(400);

  // 3. Lectura fácil (misma vista)
  await page.getByRole("switch").first().click();
  await foto("facil");
  await page.getByRole("switch").first().click();

  // 4. Panel de fuente: página del PDF con el fragmento resaltado
  await cita.click();
  await page.waitForSelector('[role="dialog"] canvas', { timeout: 30_000 });
  await espera(3500);
  pos.panel = await caja(page.locator('[role="dialog"]'));
  const lineas = await Promise.all(
    (await page.locator('[role="dialog"] .mix-blend-multiply').all()).map((l) => l.boundingBox()),
  );
  const x0 = Math.min(...lineas.map((b) => b.x));
  const y0 = Math.min(...lineas.map((b) => b.y));
  const x1 = Math.max(...lineas.map((b) => b.x + b.width));
  const y1 = Math.max(...lineas.map((b) => b.y + b.height));
  pos.resaltado = redondo({ x: x0, y: y0, width: x1 - x0, height: y1 - y0 });
  await foto("fuente");
  await page.keyboard.press("Escape");

  // 5. Chat: la misma selección de partidos y una pregunta real
  await page.goto(`${BASE}/pregunta`, { waitUntil: "networkidle" });
  for (const n of NOMBRES_CHIP) await page.getByRole("button", { name: n, exact: true }).click();
  await page.getByRole("button", { name: PREGUNTA }).click();
  await page.getByRole("button", { name: "Detener" }).waitFor({ state: "detached", timeout: 120_000 });
  await espera(1500);
  const mensajes = page.locator("ol > li");
  const formulario = page.locator("form").last();
  // Coordenadas de página: el vídeo desplaza la conversación por debajo de la cabecera y del
  // formulario fijos, como al leer la respuesta en el teléfono
  const chat = {
    cabecera: (await caja(cabecera)).h,
    burbuja: await caja(mensajes.first().locator("p").first(), true),
    respuesta: await caja(mensajes.nth(1), true),
    citas: await Promise.all(
      (await mensajes.nth(1).locator('button[aria-label^="Fuente:"]').all()).map((c) => caja(c, true)),
    ),
  };
  // Posición natural del formulario (al final de la página deja de estar pegado abajo)
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await espera(300);
  chat.formularioNatural = (await caja(formulario, true)).y;
  // Vista con el formulario pegado abajo: de aquí salen la cabecera y el formulario superpuestos
  await page.evaluate((y) => window.scrollTo(0, y), chat.burbuja.y - chat.cabecera - 40);
  await espera(400);
  chat.formulario = await caja(formulario);
  await foto("chat");
  // Conversación completa, sin cabecera ni formulario (se superponen en el vídeo)
  await cabecera.evaluate((el) => (el.style.visibility = "hidden"));
  await formulario.evaluate((el) => (el.style.visibility = "hidden"));
  chat.alto = await page.evaluate(() => document.documentElement.scrollHeight);
  await foto("chat-pagina", { fullPage: true });
  pos.chat = chat;

  await browser.close();
  return pos;
}

const posiciones = {};
for (const [nombre, opciones] of Object.entries(FORMATOS)) {
  posiciones[nombre] = await capturar(nombre, opciones);
}
writeFileSync(new URL("./src/posiciones.json", import.meta.url), JSON.stringify(posiciones, null, 2) + "\n");
console.log("✓ posiciones guardadas");
