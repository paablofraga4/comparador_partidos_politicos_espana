/**
 * Al arrancar el servidor en producción, prepara la base del chat (migraciones + índices) en un
 * proceso aparte y sin esperar: la web sirve desde el primer momento. No depende de que Railway
 * ejecute el pre-deploy, y si la base se reinicia vacía, se rehace sola. Es idempotente e
 * incremental por hash: si el pre-deploy ya lo hizo, esta pasada no cambia nada.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NODE_ENV !== "production" || !process.env.DATABASE_URL) return;
  const { existsSync } = await import("node:fs");
  const { spawn } = await import("node:child_process");
  const path = await import("node:path");
  const script = path.resolve(process.cwd(), "scripts", "dist", "predeploy.mjs");
  if (!existsSync(script)) return;
  const hijo = spawn(process.execPath, [script], { stdio: "inherit" });
  hijo.on("exit", (code) => {
    if (code) console.error(`⚠ preparación de la base terminó con código ${code}`);
  });
}
