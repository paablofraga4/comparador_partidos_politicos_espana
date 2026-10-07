/**
 * Datos de la convocatoria de las generales del 29N (spec 002, HU-2.12). Fuente única: el Real
 * Decreto 806/2026 (BOE-A-2026-20742) y el calendario de la LOREG de la spec 001. El reparto de
 * diputados es el anexo del decreto, transcrito por script (su suma se comprueba en un test).
 */
export const DECRETO = {
  nombre:
    "Real Decreto 806/2026, de 5 de octubre, de disolución del Congreso de los Diputados y del Senado y de convocatoria de elecciones",
  corto: "Real Decreto 806/2026",
  boe: "BOE-A-2026-20742",
  publicado: "6 de octubre de 2026",
  url: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-20742",
};

/** Calendario: hitos del decreto (arts. 2, 4 y 5) y plazos de la LOREG (spec 001). */
export const CALENDARIO: { fecha: string; hito: string; fuente: "decreto" | "loreg" }[] = [
  { fecha: "6 de octubre", hito: "El BOE publica la convocatoria", fuente: "decreto" },
  { fecha: "Hasta el 16 de octubre", hito: "Plazo para comunicar coaliciones", fuente: "loreg" },
  {
    fecha: "Del 21 al 26 de octubre",
    hito: "Presentación de candidaturas (partidos, coaliciones y agrupaciones de electores)",
    fuente: "loreg",
  },
  {
    fecha: "Hacia el 28 de octubre",
    hito: "El BOE publica las candidaturas presentadas",
    fuente: "loreg",
  },
  { fecha: "2 y 3 de noviembre", hito: "Proclamación de las candidaturas", fuente: "loreg" },
  {
    fecha: "Del 13 al 27 de noviembre",
    hito: "Campaña electoral (empieza a las 0:00 del viernes 13 y acaba a las 24:00 del viernes 27)",
    fuente: "decreto",
  },
  {
    fecha: "Domingo 29 de noviembre",
    hito: "Elecciones al Congreso y al Senado",
    fuente: "decreto",
  },
  {
    fecha: "23 de diciembre",
    hito: "Sesiones constitutivas de las nuevas Cortes (10:00)",
    fuente: "decreto",
  },
];

/** Anexo del decreto: diputados por circunscripción. */
export const DIPUTADOS: [string, number][] = [
  ["Albacete", 4],
  ["Alicante/Alacant", 12],
  ["Almería", 6],
  ["Araba/Álava", 4],
  ["Asturias", 7],
  ["Ávila", 3],
  ["Badajoz", 5],
  ["Balears (Illes)", 8],
  ["Barcelona", 32],
  ["Bizkaia", 8],
  ["Burgos", 4],
  ["Cáceres", 4],
  ["Cádiz", 8],
  ["Cantabria", 5],
  ["Castellón/Castelló", 5],
  ["Ciudad Real", 5],
  ["Córdoba", 6],
  ["Coruña (A)", 8],
  ["Cuenca", 3],
  ["Gipuzkoa", 6],
  ["Girona", 6],
  ["Granada", 7],
  ["Guadalajara", 3],
  ["Huelva", 5],
  ["Huesca", 3],
  ["Jaén", 5],
  ["León", 4],
  ["Lleida", 4],
  ["Lugo", 4],
  ["Madrid", 38],
  ["Málaga", 11],
  ["Murcia", 10],
  ["Navarra", 5],
  ["Ourense", 4],
  ["Palencia", 3],
  ["Palmas (Las)", 8],
  ["Pontevedra", 7],
  ["Rioja (La)", 4],
  ["Salamanca", 4],
  ["Santa Cruz de Tenerife", 7],
  ["Segovia", 3],
  ["Sevilla", 12],
  ["Soria", 2],
  ["Tarragona", 6],
  ["Teruel", 3],
  ["Toledo", 6],
  ["Valencia/València", 16],
  ["Valladolid", 5],
  ["Zamora", 3],
  ["Zaragoza", 7],
  ["Ceuta", 1],
  ["Melilla", 1],
];

export const TOTAL_DIPUTADOS = DIPUTADOS.reduce((s, [, n]) => s + n, 0);
