/**
 * Códigos de bono «VC-XXXX-XXXX-XXXX» (Crockford base32, 60 bits) e identificadores.
 * En la base solo se guarda el sha256 del código canónico.
 */
import { createHash, randomInt } from "node:crypto";

const ALFABETO = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function aleatorio(n: number): string {
  let s = "";
  for (let i = 0; i < n; i++) s += ALFABETO[randomInt(ALFABETO.length)];
  return s;
}

export function nuevoCodigo(): string {
  const c = aleatorio(12);
  return `VC-${c.slice(0, 4)}-${c.slice(4, 8)}-${c.slice(8)}`;
}

/** Acepta minúsculas, espacios, guiones y las confusiones típicas (O→0, I/L→1). */
export function normalizarCodigo(entrada: string): string | null {
  let s = entrada.toUpperCase().replace(/[\s\-_.]/g, "");
  if (s.startsWith("VC")) s = s.slice(2);
  s = s.replace(/O/g, "0").replace(/[IL]/g, "1");
  if (s.length !== 12 || [...s].some((ch) => !ALFABETO.includes(ch))) return null;
  return `VC-${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8)}`;
}

export function hashCodigo(codigoCanonico: string): string {
  return createHash("sha256").update(codigoCanonico).digest("hex");
}

/** Identificador no secreto (bonos) o valor de la cookie de cuota (secreto, 120 bits). */
export function nuevoId(longitud = 10): string {
  return aleatorio(longitud).toLowerCase();
}

export function hashValor(v: string): string {
  return createHash("sha256").update(v).digest("hex");
}
