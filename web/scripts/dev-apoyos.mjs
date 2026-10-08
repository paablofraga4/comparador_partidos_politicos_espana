// Servidor local para probar bonos y apoyos sin Stripe (specs 004 y 005), en http://127.0.0.1:3102.
// Pasarela simulada y una base PGlite propia (.pglite-apoyos), aunque .env apunte a otra: nunca
// toca la base ni la cuenta de Stripe de producción.
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const cwd = fileURLToPath(new URL("..", import.meta.url));
const env = {
  ...process.env,
  DATABASE_URL: "pglite:./.pglite-apoyos",
  PAGOS_ACTIVOS: "1",
  APOYOS_ACTIVOS: "1",
  PAGOS_PASARELA: "simulada",
  STRIPE_PORTAL_URL: "https://billing.stripe.com/p/login/simulado",
};

spawnSync("npx", ["tsx", "scripts/db-migrate.mts"], { cwd, stdio: "inherit", shell: true, env });
const child = spawn(
  "npx",
  ["next", "dev", "--port", process.env.PORT ?? "3102", "--hostname", "127.0.0.1"],
  { cwd, stdio: "inherit", shell: true, env },
);
child.on("exit", (code) => process.exit(code ?? 0));
