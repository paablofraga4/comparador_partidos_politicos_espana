// Aplica las migraciones SQL pendientes (pre-deploy de Railway y desarrollo).
import path from "node:path";

import { cargarConfigModelos } from "../lib/config";
import { getDb } from "../lib/db";
import { migrar } from "../lib/indice";

cargarConfigModelos();
if (!process.env.DATABASE_URL) {
  console.warn("⚠ sin DATABASE_URL: el chat aún no tiene base de datos; nada que hacer");
  process.exit(0);
}
const dir = process.env.VC_MIGRACIONES_DIR ?? path.resolve(process.cwd(), "db", "migraciones");
const db = await getDb();
const aplicadas = await migrar(db, dir);
console.log(
  aplicadas.length ? `✓ migraciones aplicadas: ${aplicadas.join(", ")}` : "✓ esquema al día",
);
await db.end();
