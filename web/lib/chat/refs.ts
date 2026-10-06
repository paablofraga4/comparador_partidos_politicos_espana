/**
 * Referencias de cita del chat (skill grounding, spec 003 HU-3.2). Puro: servidor y cliente.
 *
 * El modelo cita con marcas [[ref]]. Cada ref sale de un resultado de herramienta de ESE turno
 * y se envía al cliente como parte de datos («data-fuente»). El cliente solo pinta las marcas
 * cuya ref está en ese registro: una ref inventada por el modelo nunca llega a la pantalla.
 */
export type FuenteChat = {
  ref: string;
  tipo: "cita" | "fragmento";
  conv: string;
  cand: string;
  /** id de la cita del análisis (c0012) o id del fragmento (pp-23-p047-02) */
  id: string;
  pagina: string;
  candCorto: string;
  convCorto: string;
};

const yy = (conv: string) => conv.slice(-2);

export function refCita(cand: string, conv: string, cid: string): string {
  return `${cand}${yy(conv)}:${cid}`;
}

export function refFragmento(cand: string, conv: string, chunkId: string): string {
  const prefijo = `${cand}-${yy(conv)}-`;
  return `${cand}${yy(conv)}:${chunkId.startsWith(prefijo) ? chunkId.slice(prefijo.length) : chunkId}`;
}

const MARCA = /\[\[([^\]]{3,200})\]\]/g;
const REF = /^[a-z0-9-]+\d{2}:[a-z0-9-]+$/;

export type Segmento = { tipo: "texto"; valor: string } | { tipo: "citas"; fuentes: FuenteChat[] };

/** Trocea el texto en texto y grupos de citas válidas; descarta las refs desconocidas. */
export function segmentar(
  texto: string,
  registro: Map<string, FuenteChat>,
): { segmentos: Segmento[]; descartadas: number } {
  const segmentos: Segmento[] = [];
  let descartadas = 0;
  let ultimo = 0;
  for (const m of texto.matchAll(MARCA)) {
    if (m.index! > ultimo) segmentos.push({ tipo: "texto", valor: texto.slice(ultimo, m.index) });
    const refs = m[1].split(/[\s,;]+/).filter(Boolean);
    const fuentes: FuenteChat[] = [];
    for (const r of refs) {
      const f = REF.test(r) ? registro.get(r) : undefined;
      if (f) fuentes.push(f);
      else descartadas++;
    }
    if (fuentes.length) segmentos.push({ tipo: "citas", fuentes });
    ultimo = m.index! + m[0].length;
  }
  if (ultimo < texto.length) segmentos.push({ tipo: "texto", valor: texto.slice(ultimo) });
  return { segmentos, descartadas };
}

/** Marcas abiertas al final de un texto en streaming («…[[pp23:c00»): se ocultan hasta cerrarse. */
export function sinMarcaIncompleta(texto: string): string {
  const i = texto.lastIndexOf("[[");
  return i >= 0 && texto.indexOf("]]", i) === -1 ? texto.slice(0, i) : texto;
}
