// Stop: back-pressure. Si Claude ha tocado web/, pipeline/ o data/, ejecuta las comprobaciones
// rápidas de esa zona antes de dejarle terminar. Si fallan, le devuelve el error para que lo
// arregle. Las comprobaciones lentas (e2e, evals) quedan para la CI.
import { readInput, run, has, commandExists, ROOT } from "./lib.mjs";

const input = await readInput();
// Evita bucles: si ya estamos continuando por un bloqueo previo, deja terminar.
if (input.stop_hook_active) process.exit(0);

const status = run("git status --porcelain", ROOT, 10_000);
if (!status.ok) process.exit(0);
const changed = status.out
  .split("\n")
  .map((l) => l.slice(3).trim().replace(/^"|"$/g, ""))
  .filter(Boolean);

const touched = (prefix) => changed.some((f) => f.startsWith(prefix));
const failures = [];

if (touched("web/") && has("web/node_modules")) {
  for (const script of ["typecheck", "lint"]) {
    const r = run(`npm run -s ${script}`, `${ROOT}/web`, 180_000);
    if (!r.ok) failures.push(`web · npm run ${script}\n${r.out.slice(-3000)}`);
  }
}

if (touched("pipeline/") && has("pipeline/pyproject.toml") && commandExists("uv")) {
  const lint = run("uv run --quiet ruff check .", `${ROOT}/pipeline`, 120_000);
  if (!lint.ok) failures.push(`pipeline · ruff check\n${lint.out.slice(-3000)}`);
  const tests = run("uv run --quiet pytest -q -x -m \"not slow\"", `${ROOT}/pipeline`, 300_000);
  if (!tests.ok) failures.push(`pipeline · pytest\n${tests.out.slice(-3000)}`);
}

if ((touched("data/analyses/") || touched("data/candidaturas.yaml") || touched("data/topics.yaml")) &&
    has("pipeline/pyproject.toml") && commandExists("uv")) {
  const v = run("uv run --quiet cmp validate", `${ROOT}/pipeline`, 300_000);
  if (!v.ok) failures.push(`data · cmp validate\n${v.out.slice(-3000)}`);
}

if (failures.length) {
  process.stdout.write(
    JSON.stringify({
      decision: "block",
      reason:
        "Las comprobaciones del harness han fallado. Corrígelas antes de terminar " +
        "(o explica al usuario por qué no procede):\n\n" + failures.join("\n\n---\n\n"),
    }),
  );
}
process.exit(0);
