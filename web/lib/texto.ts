/** Quita tildes y diéresis (la ñ se conserva) para que «pension» encuentre «pensión». */
export function plegar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/(?!̃)[̀-ͯ]/g, "")
    .normalize("NFC")
    .toLowerCase();
}

/**
 * Consulta léxica en modo «o» para Postgres (`to_tsquery('spanish', …)`): las preguntas en
 * lenguaje natural casi nunca contienen TODAS las palabras de un fragmento relevante. Solo
 * letras y números: no hay inyección posible en la sintaxis de tsquery.
 */
export function consultaLexica(texto: string): string | null {
  const palabras = plegar(texto)
    .split(/[^a-z0-9ñ]+/)
    .filter((p) => p.length > 2);
  const unicas = [...new Set(palabras)].slice(0, 24);
  return unicas.length ? unicas.join(" | ") : null;
}
