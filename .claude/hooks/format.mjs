// PostToolUse (Edit|Write): formatea el fichero tocado. Nunca bloquea; si falta la
// herramienta (aún no instalada en F0) simplemente no hace nada.
import { readInput, run, has, uvCmd, rel, ROOT } from "./lib.mjs";

const input = await readInput();
const file = input.tool_input?.file_path;
if (!file) process.exit(0);

const r = rel(file);

if (r.startsWith("web/") && /\.(ts|tsx|js|mjs|cjs|json|css|md|mdx)$/.test(r)) {
  if (has("web/node_modules/.bin/prettier") || has("web/node_modules/.bin/prettier.cmd")) {
    run(`npx --no-install prettier --write "${r.slice(4)}"`, `${ROOT}/web`, 30_000);
  }
}

const UV = r.startsWith("pipeline/") && r.endsWith(".py") ? uvCmd() : null;
if (UV) {
  run(`${UV} run --quiet ruff format "${r.slice(9)}"`, `${ROOT}/pipeline`, 30_000);
  run(`${UV} run --quiet ruff check --fix --quiet "${r.slice(9)}"`, `${ROOT}/pipeline`, 30_000);
}

process.exit(0);
