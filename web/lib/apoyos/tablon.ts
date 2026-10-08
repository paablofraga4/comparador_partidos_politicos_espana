/**
 * Tablón de apoyos (spec 005, HU-5.5). Las listas solo llevan nombres: los importes sirven para
 * ordenar «Quienes más han apoyado», pero nunca salen de aquí.
 */
import type { Db } from "../db";
import type { Periodo, TipoApoyo } from "./config";
import { claveNombre } from "./nombres";

export const TAM_LISTAS = 10;

export type Tablon = {
  /** Nombres, de más a menos aportado (empates: quien empezó antes). */
  top: string[];
  /** Los apoyos con nombre más recientes. */
  ultimos: { nombre: string; tipo: TipoApoyo; fecha: Date }[];
  /** Apoyos que no salen con nombre (no lo dieron, no pasó el filtro o se ocultó). */
  anonimos: number;
  personas: number;
  mensualesActivos: number;
  totalCent: number;
  cobros: number;
};

type Fila = {
  id: string;
  tipo: TipoApoyo;
  nombre: string | null;
  estado: string;
  activado: string | Date | null;
  total_cent: number;
  cobros: number;
};

/** Inicio del mes en curso en la hora de España (para el periodo «este mes»). */
export function inicioDeMes(ahora = new Date()): Date {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Madrid", year: "numeric", month: "numeric" })
      .formatToParts(ahora)
      .map((p) => [p.type, p.value]),
  );
  const y = Number(partes.year);
  const m = Number(partes.month) - 1;
  const desfase = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Madrid", timeZoneName: "shortOffset" })
    .formatToParts(new Date(Date.UTC(y, m, 1, 12)))
    .find((p) => p.type === "timeZoneName")?.value;
  const horas = Number(desfase?.replace("GMT", "") || 0);
  return new Date(Date.UTC(y, m, 1) - horas * 3_600_000);
}

export const desdePeriodo = (p: Periodo, ahora = new Date()): Date | null =>
  p === "mes" ? inicioDeMes(ahora) : null;

export async function tablon(
  db: Db,
  opciones: { desde: Date | null; ocultos: Set<string> },
): Promise<Tablon> {
  const filas = await db.query<Fila>(
    `select a.id, a.tipo, a.nombre, a.estado, a.activado,
            sum(c.importe_cent)::int as total_cent, count(*)::int as cobros
     from apoyos a join apoyo_cobros c on c.apoyo = a.id
     where not c.devuelto and ($1::timestamptz is null or c.cobrado >= $1::timestamptz)
     group by a.id, a.tipo, a.nombre, a.estado, a.activado`,
    [opciones.desde?.toISOString() ?? null],
  );
  const fecha = (f: Fila) => (f.activado ? new Date(f.activado).getTime() : 0);
  const publicos = filas.filter((f) => f.nombre && !opciones.ocultos.has(f.id));

  // El mismo nombre en varios apoyos suma como una sola persona, con la grafía más reciente
  const porNombre = new Map<string, { nombre: string; total: number; desde: number; ultimo: number }>();
  for (const f of publicos) {
    const k = claveNombre(f.nombre!);
    const p = porNombre.get(k) ?? { nombre: f.nombre!, total: 0, desde: fecha(f), ultimo: -1 };
    p.total += Number(f.total_cent);
    p.desde = Math.min(p.desde, fecha(f));
    if (fecha(f) > p.ultimo) [p.nombre, p.ultimo] = [f.nombre!, fecha(f)];
    porNombre.set(k, p);
  }
  const top = [...porNombre.values()]
    .sort((a, b) => b.total - a.total || a.desde - b.desde)
    .slice(0, TAM_LISTAS)
    .map((p) => p.nombre);

  const vistos = new Set<string>();
  const ultimos = [...publicos]
    .sort((a, b) => fecha(b) - fecha(a))
    .filter((f) => {
      const k = claveNombre(f.nombre!);
      if (vistos.has(k)) return false;
      vistos.add(k);
      return true;
    })
    .slice(0, TAM_LISTAS)
    .map((f) => ({ nombre: f.nombre!, tipo: f.tipo, fecha: new Date(fecha(f)) }));

  return {
    top,
    ultimos,
    anonimos: filas.length - publicos.length,
    personas: filas.length,
    mensualesActivos: filas.filter((f) => f.tipo === "mensual" && f.estado === "activo").length,
    totalCent: filas.reduce((s, f) => s + Number(f.total_cent), 0),
    cobros: filas.reduce((s, f) => s + Number(f.cobros), 0),
  };
}
