const POR_DEFECTO = "http://localhost:3000";

/** URL pública del sitio a partir de NEXT_PUBLIC_SITE_URL. Tolera el valor sin protocolo
 * («midominio.up.railway.app») o con espacios: un valor mal escrito no debe romper la
 * compilación (pasó en Railway). Si no es una URL válida, usa localhost. */
export function urlDelSitio(valor: string | undefined): URL {
  const v = valor?.trim();
  if (!v) return new URL(POR_DEFECTO);
  try {
    return new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
  } catch {
    return new URL(POR_DEFECTO);
  }
}
