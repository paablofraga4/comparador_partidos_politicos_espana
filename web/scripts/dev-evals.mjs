// Servidor local para los evals del chat (spec 003): `npm run evals -- --url http://127.0.0.1:3101`
// con el mismo CHAT_EVALS_TOKEN. Usa la base PGlite local (aunque .env apunte a otra), incluye
// los análisis en borrador y sube el tope diario: los evals sí cuentan en el presupuesto.
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const child = spawn(
  "npx",
  ["next", "dev", "--port", process.env.PORT ?? "3101", "--hostname", "127.0.0.1"],
  {
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    stdio: "inherit",
    shell: true,
    env: {
      ...process.env,
      DATABASE_URL: "pglite:./.pglite",
      CHAT_ACTIVO: "1",
      VC_MOSTRAR_BORRADORES: "1",
      CHAT_DAILY_BUDGET_USD: process.env.CHAT_DAILY_BUDGET_USD_EVALS ?? "20",
      CHAT_EVALS_TOKEN: process.env.CHAT_EVALS_TOKEN || "evals-local",
    },
  },
);
child.on("exit", (code) => process.exit(code ?? 0));
