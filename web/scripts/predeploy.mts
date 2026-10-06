// Pre-deploy de Railway: migraciones y después sincronización de índices, como procesos
// separados. Un solo comando sin «&&», porque no está garantizado que Railway lo ejecute
// en un shell.
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

for (const paso of ["db-migrate.mjs", "db-sync.mjs"]) {
  console.log(`▶ ${paso}`);
  execFileSync(process.execPath, [fileURLToPath(new URL(`./${paso}`, import.meta.url))], {
    stdio: "inherit",
  });
}
