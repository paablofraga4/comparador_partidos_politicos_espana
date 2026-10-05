// Utilidades compartidas por los hooks de Claude Code de este proyecto.
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

export const ROOT = process.env.CLAUDE_PROJECT_DIR || process.cwd();

export async function readInput() {
  let raw = "";
  for await (const chunk of process.stdin) raw += chunk;
  try {
    return JSON.parse(raw || "{}");
  } catch {
    return {};
  }
}

/** Bloquea la acción: el mensaje llega a Claude como feedback (exit code 2). */
export function block(message) {
  process.stderr.write(message + "\n");
  process.exit(2);
}

export function run(cmd, cwd = ROOT, timeoutMs = 120_000) {
  try {
    const out = execSync(cmd, { cwd, stdio: "pipe", timeout: timeoutMs, encoding: "utf8" });
    return { ok: true, out };
  } catch (err) {
    const out = `${err.stdout ?? ""}${err.stderr ?? ""}`.trim() || String(err.message);
    return { ok: false, out };
  }
}

export function has(relPath) {
  return existsSync(path.join(ROOT, relPath));
}

export function commandExists(cmd) {
  const probe = process.platform === "win32" ? `where ${cmd}` : `command -v ${cmd}`;
  return run(probe).ok;
}

export function rel(p) {
  return path.relative(ROOT, path.resolve(ROOT, p)).split(path.sep).join("/");
}
