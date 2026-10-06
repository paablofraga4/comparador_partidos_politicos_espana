import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * Carga .env (local) y config/models.env (versionado, no secreto) en process.env sin pisar
 * valores no vacíos: las variables de Railway tienen prioridad. Igual que el pipeline (paths.py).
 * Nunca imprime valores.
 */
function cargarFichero(fichero: string): void {
  if (!existsSync(fichero)) return;
  for (const linea of readFileSync(fichero, "utf8").split(/\r?\n/)) {
    const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && m[2] && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

export function cargarConfigModelos(): void {
  const raiz = process.env.VC_CONFIG_DIR
    ? path.resolve(process.env.VC_CONFIG_DIR, "..")
    : existsSync(path.resolve(process.cwd(), "..", "config"))
      ? path.resolve(process.cwd(), "..")
      : process.cwd();
  // 1) .env de la raíz del repo (solo en local; en Railway las variables vienen del entorno)
  cargarFichero(path.join(raiz, ".env"));
  // 2) configuración de modelos versionada
  cargarFichero(path.join(raiz, "config", "models.env"));
}

export function precio(rol: "CHAT" | "FAST" | "ANALYSIS"): [number, number, number] | null {
  const p = process.env[`OPENAI_PRICE_${rol}`];
  if (!p) return null;
  const [a, b, c] = p.split(",").map(Number);
  return [a, b, c];
}

export function numeroEnv(nombre: string, defecto: number): number {
  const v = Number(process.env[nombre]);
  return Number.isFinite(v) && v > 0 ? v : defecto;
}
