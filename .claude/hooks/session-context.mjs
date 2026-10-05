// SessionStart: inyecta en el contexto la fase actual y las próximas tareas pendientes,
// para que cada sesión arranque sabiendo dónde está el proyecto sin releer todo.
import { readFileSync } from "node:fs";
import { run, ROOT } from "./lib.mjs";

let tasks = "";
try {
  tasks = readFileSync(`${ROOT}/specs/tasks.md`, "utf8");
} catch {
  process.exit(0);
}

let phase = "";
const pending = [];
for (const line of tasks.split("\n")) {
  if (line.startsWith("## ")) phase = line.slice(3).trim();
  if (/^- \[ \]/.test(line) && pending.length < 5) pending.push(`${phase} → ${line.slice(6).trim()}`);
}
const branch = run("git branch --show-current", ROOT, 5_000).out.trim();

process.stdout.write(
  [
    "## Estado del proyecto (hook SessionStart)",
    `Rama: ${branch || "?"}`,
    "Próximas tareas pendientes (specs/tasks.md):",
    ...pending.map((t) => `- ${t}`),
    "Recuerda: spec aprobada antes de código; reglas de oro en CLAUDE.md.",
  ].join("\n"),
);
