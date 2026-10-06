import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

/** Ver instrumentation.ts. Solo se carga en el runtime de Node. */
export function prepararBase() {
  if (process.env.NODE_ENV !== "production" || !process.env.DATABASE_URL) return;
  const script = path.resolve(process.cwd(), "scripts", "dist", "predeploy.mjs");
  if (!existsSync(script)) return;
  const hijo = spawn(process.execPath, [script], { stdio: "inherit" });
  hijo.on("exit", (code) => {
    if (code) console.error(`⚠ preparación de la base terminó con código ${code}`);
  });
}
