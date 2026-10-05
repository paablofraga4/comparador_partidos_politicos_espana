// Servidor de desarrollo en «vista previa»: muestra análisis en borrador con su marca visible.
// (No usamos .env.development: el harness protege los ficheros .env*.)
import { spawn } from "node:child_process";

const child = spawn("npx", ["next", "dev", "--port", process.env.PORT ?? "3000"], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, VC_MOSTRAR_BORRADORES: "1" },
});
child.on("exit", (code) => process.exit(code ?? 0));
