/**
 * Filtro de los nombres del tablón (spec 005, HU-5.6). Ante la duda, el apoyo queda anónimo:
 * un nombre legítimo descartado solo pierde visibilidad, mientras que un lema político en el
 * tablón de un comparador neutral sería un problema.
 */
export const MAX_NOMBRE = 40;

/** Partidos que no están en candidaturas.yaml pero que no deben aparecer en el tablón. */
const OTROS_PARTIDOS = [
  "Ciudadanos",
  "Cs",
  "IU",
  "Izquierda Unida",
  "Más Madrid",
  "Más País",
  "Compromís",
  "Teruel Existe",
  "SALF",
  "Se Acabó La Fiesta",
  "CUP",
  "Coalición Canaria",
  "Falange",
  "PACMA",
];

/** Lemas y palabras de campaña, como palabra completa (sin tildes). */
const LEMAS = [
  "vota", "votad", "voten", "votar", "votadme", "viva", "vivan", "arriba", "abajo", "fuera",
  "dimision", "dimite", "facha", "fachas", "rojos", "comunista", "comunistas", "fascista",
  "fascistas", "nazi", "nazis", "franquista", "franquistas", "golpista", "golpistas",
  "separatista", "separatistas", "traidor", "traidores", "independencia",
];

/** Insultos frecuentes (sin tildes). La lista es corta a propósito; el resto se oculta a mano. */
const INSULTOS = [
  "puta", "puto", "putas", "putos", "mierda", "gilipollas", "cabron", "cabrones", "cono",
  "joder", "polla", "maricon", "subnormal", "retrasado", "imbecil", "idiota", "zorra",
  "follar", "hijoputa", "hdp",
];

const ENLACE = /https?:|www\.|@|\.(com|es|net|org|app|io|info|eu|cat|gal|eus|me|co|xyz|online|site|dev|ly|gl|tv)\b/i;

/** Minúsculas y sin tildes, para comparar palabras. */
const plano = (s: string) =>
  s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** ¿Aparece `frase` como palabra (o palabras) completa dentro de `texto`? Ambos ya en plano. */
function contiene(texto: string, frase: string): boolean {
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escapar(frase)}($|[^\\p{L}\\p{N}])`, "u").test(texto);
}

/** Limpia lo que escribe la persona: sin caracteres invisibles, espacios simples y 40 como máximo. */
export function limpiarNombre(entrada: string | null | undefined): string | null {
  if (!entrada) return null;
  const s = entrada
    .normalize("NFC")
    .replace(/[\p{C}]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_NOMBRE)
    .trim();
  return s || null;
}

/**
 * Nombre que puede salir en el tablón, o null si el apoyo debe quedar anónimo.
 * `partidos`: siglas y nombres de las candidaturas (de candidaturas.yaml).
 */
export function nombreParaTablon(
  entrada: string | null | undefined,
  partidos: readonly string[],
): string | null {
  const nombre = limpiarNombre(entrada);
  if (!nombre) return null;
  if (ENLACE.test(nombre)) return null;
  const p = plano(nombre);
  const prohibidas = [...partidos, ...OTROS_PARTIDOS].map(plano).concat(LEMAS, INSULTOS);
  return prohibidas.some((f) => f && contiene(p, f)) ? null : nombre;
}

/** Clave para agrupar el mismo nombre escrito de formas distintas («Ana López» = «ana lopez»). */
export const claveNombre = (nombre: string) => plano(nombre).replace(/[^\p{L}\p{N}]+/gu, " ").trim();
