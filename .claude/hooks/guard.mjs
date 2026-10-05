// PreToolUse: guardarraíles deterministas.
// - Secretos: nunca leer/escribir .env reales (solo .env.example).
// - Comandos destructivos o irreversibles: bloquear y pedir confirmación al usuario.
import { readInput, block, rel } from "./lib.mjs";

const input = await readInput();
const tool = input.tool_name ?? "";
const ti = input.tool_input ?? {};

const isSecretFile = (p) => {
  const name = rel(p).split("/").pop() ?? "";
  return /^\.env(\..+)?$/.test(name) && name !== ".env.example";
};

if (["Read", "Edit", "Write", "MultiEdit", "NotebookEdit"].includes(tool)) {
  const p = ti.file_path ?? ti.notebook_path ?? "";
  if (p && isSecretFile(p)) {
    block(
      `Bloqueado: ${rel(p)} contiene secretos. Usa .env.example para documentar variables; ` +
        "los valores reales los gestiona el usuario (local, Railway, GitHub Secrets).",
    );
  }
}

if (tool === "Bash" || tool === "PowerShell") {
  const cmd = String(ti.command ?? "");
  const rules = [
    [/git\s+push\b[^\n]*(--force\b|\s-f\b)/, "push forzado"],
    [/git\s+push\b[^\n]*--force-with-lease/, "push forzado"],
    [/rm\s+-[a-z]*r[a-z]*f?[^\n]*\b(data|specs)\b/, "borrado recursivo de data/ o specs/"],
    [/Remove-Item[^\n]*-Recurse[^\n]*\b(data|specs)\b/i, "borrado recursivo de data/ o specs/"],
    [/\b(DROP\s+(TABLE|DATABASE|SCHEMA)|TRUNCATE\s+TABLE)\b/i, "operación destructiva en base de datos"],
    [/\brailway\s+(down|delete)\b/, "borrado de un despliegue/servicio en Railway"],
    [/\b(cat|type|more|less|head|tail|Get-Content|gc)\b[^\n|]*\.env(\.(?!example)\w+)*(\s|$)/, "lectura de .env"],
    [/\bprintenv\b|\benv\s*$|Get-ChildItem\s+env:/i, "volcado de variables de entorno"],
  ];
  for (const [re, what] of rules) {
    if (re.test(cmd)) {
      block(
        `Bloqueado por el harness (${what}). Si es realmente necesario, explica por qué al ` +
          "usuario y pídele que lo ejecute él o que lo confirme explícitamente.",
      );
    }
  }
}

process.exit(0);
