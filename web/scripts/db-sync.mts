// Sincroniza los índices del chat con data/ (incremental por hash) y calcula los embeddings
// que falten. Si no hay crédito en la API, deja la búsqueda léxica funcionando y avisa.
import path from "node:path";

import { cargarConfigModelos } from "../lib/config";
import { getDb } from "../lib/db";
import { embedderOpenAI } from "../lib/embeddings";
import {
  embeberPendientes,
  filasFragmentos,
  filasPropuestas,
  sincronizarFragmentos,
  sincronizarPropuestas,
} from "../lib/indice";

cargarConfigModelos();
if (!process.env.DATABASE_URL) {
  console.warn("⚠ sin DATABASE_URL: el chat aún no tiene base de datos; nada que hacer");
  process.exit(0);
}
const dataDir = process.env.VC_DATA_DIR ?? path.resolve(process.cwd(), "..", "data");
const mostrarBorradores = process.env.VC_MOSTRAR_BORRADORES === "1";
const db = await getDb();

const fr = await sincronizarFragmentos(db, filasFragmentos(dataDir));
console.log(`fragmentos · +${fr.nuevas} ~${fr.actualizadas} -${fr.borradas}`);
const pr = await sincronizarPropuestas(db, filasPropuestas(dataDir, { mostrarBorradores }));
console.log(
  `propuestas · +${pr.nuevas} ~${pr.actualizadas} -${pr.borradas}${mostrarBorradores ? " (incluye borradores)" : ""}`,
);

if (process.env.OPENAI_API_KEY && process.argv.includes("--sin-embeddings") === false) {
  try {
    const a = await embeberPendientes(db, "fragmentos", embedderOpenAI);
    const b = await embeberPendientes(db, "propuestas", embedderOpenAI);
    const tokens = a.tokens + b.tokens;
    console.log(
      `embeddings · ${a.filas + b.filas} filas · ${tokens} tokens · ~${((tokens * 0.13) / 1e6).toFixed(4)} USD`,
    );
  } catch (e) {
    console.warn(
      `⚠ embeddings pendientes (la búsqueda léxica funciona igual): ${String((e as Error).message).slice(0, 160)}`,
    );
  }
} else {
  console.warn("⚠ sin OPENAI_API_KEY: embeddings pendientes (búsqueda solo léxica)");
}
await db.end();
