import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { activarBono, crearBonoPendiente } from "../bonos/cupo";
import { planPorId } from "../bonos/planes";
import { getDb, type Db } from "../db";
import { migrar } from "../indice";
import { estadoApoyos, leerImporte, ocultos, periodo, urlPortal } from "./config";
import {
  centMensual,
  comisionEstimadaCent,
  fijosMensualCent,
  iaUltimos30Usd,
  ingresosBonos,
} from "./cuentas";
import { claveNombre, limpiarNombre, nombreParaTablon } from "./nombres";
import {
  activarApoyo,
  cancelarApoyo,
  crearApoyoPendiente,
  devolverCobroPorPago,
  leerApoyo,
  registrarCobro,
} from "./registro";
import { inicioDeMes, tablon } from "./tablon";

const MIGRACIONES = path.resolve(__dirname, "..", "..", "db", "migraciones");
const PARTIDOS = ["PP", "Partido Popular", "PSOE", "VOX", "Sumar", "EH Bildu", "Bildu", "Podemos"];
let db: Db;

beforeAll(async () => {
  db = await getDb("pglite:memory");
  await migrar(db, MIGRACIONES);
});
afterAll(async () => db.end());
beforeEach(async () => {
  await db.exec("delete from apoyo_cobros; delete from apoyos;");
});

/** Apoyo pagado con su primer cobro, como lo deja la vuelta del pago o el webhook. */
async function apoyar(
  tipo: "mensual" | "puntual",
  cent: number,
  nombre: string | null,
  cobro: { id: string; pago: string; cobrado?: Date },
) {
  const id = await crearApoyoPendiente(db, tipo, cent);
  await activarApoyo(db, id, nombre);
  await registrarCobro(db, { id: cobro.id, apoyoId: id, importeCent: cent, pago: cobro.pago, cobrado: cobro.cobrado });
  return id;
}

describe("filtro de nombres (HU-5.6)", () => {
  it("deja pasar nombres normales y limpia espacios y caracteres invisibles", () => {
    expect(nombreParaTablon("  Ana   López ", PARTIDOS)).toBe("Ana López");
    expect(nombreParaTablon("María​ Pérez", PARTIDOS)).toBe("María Pérez");
    expect(nombreParaTablon("Pepe Sánchez", PARTIDOS)).toBe("Pepe Sánchez");
    expect(nombreParaTablon("Familia Voxer", PARTIDOS)).toBe("Familia Voxer");
    expect(limpiarNombre("x".repeat(60))).toHaveLength(40);
    expect(nombreParaTablon("   ", PARTIDOS)).toBeNull();
  });

  it("deja anónimo lo que lleva partidos, lemas, insultos o enlaces", () => {
    for (const n of [
      "Ana del PP",
      "vox",
      "Socios del psoe",
      "Bildu sí",
      "partido popular",
      "Ciudadanos libres",
      "Vota bien",
      "¡Viva la república!",
      "Pepe facha",
      "Juan mierda",
      "www.miweb.es",
      "ana@correo.com",
      "https://x.com/ana",
      "Ana (anamola.com)",
    ]) {
      expect(nombreParaTablon(n, PARTIDOS), n).toBeNull();
    }
  });

  it("agrupa el mismo nombre escrito de formas distintas", () => {
    expect(claveNombre("Ana López")).toBe(claveNombre("  ana   LOPEZ"));
  });
});

describe("interruptor y ajustes (HU-5.8)", () => {
  const completo = {
    APOYOS_ACTIVOS: "1",
    STRIPE_SECRET_KEY: "sk",
    STRIPE_WEBHOOK_SECRET: "wh",
    TITULAR_NOMBRE: "Nombre",
    TITULAR_NIF: "000",
    TITULAR_EMAIL: "a@b.c",
  };

  it("sin titular o sin claves no se puede apoyar, aunque esté encendido", () => {
    expect(estadoApoyos(completo)).toEqual({ activos: true, pasarela: "stripe" });
    expect(estadoApoyos({ ...completo, APOYOS_ACTIVOS: undefined }).activos).toBe(false);
    expect(estadoApoyos({ ...completo, TITULAR_NIF: "" }).activos).toBe(false);
    expect(estadoApoyos({ ...completo, STRIPE_SECRET_KEY: undefined }).activos).toBe(false);
    // Independiente del interruptor de los bonos
    expect(estadoApoyos({ ...completo, PAGOS_ACTIVOS: "0" }).activos).toBe(true);
  });

  it("importes: los fijos de cada tipo y otra cantidad solo en los puntuales", () => {
    expect(leerImporte("mensual", "500", null)).toBe(500);
    expect(leerImporte("mensual", "300", null)).toBeNull();
    expect(leerImporte("mensual", "otro", "7")).toBeNull();
    expect(leerImporte("puntual", "2500", null)).toBe(2500);
    expect(leerImporte("puntual", "otro", "7,50")).toBe(750);
    expect(leerImporte("puntual", "otro", "1,99")).toBeNull();
    expect(leerImporte("puntual", "otro", "5000")).toBeNull();
    expect(leerImporte("puntual", "otro", "abc")).toBeNull();
  });

  it("periodo, ocultos y portal", () => {
    expect(periodo({})).toBe("total");
    expect(periodo({ APOYOS_PERIODO: "mes" })).toBe("mes");
    expect([...ocultos({ APOYOS_OCULTOS: "ap_1, ap_2 ap_3" })]).toEqual(["ap_1", "ap_2", "ap_3"]);
    expect(urlPortal({ STRIPE_PORTAL_URL: "https://billing.stripe.com/p/login/x" })).toMatch(/^https/);
    expect(urlPortal({ STRIPE_PORTAL_URL: "javascript:alert(1)" })).toBeNull();
  });
});

describe("registro de apoyos (HU-5.4 y HU-5.7)", () => {
  it("activar y cobrar es idempotente; el nombre no se pisa", async () => {
    const id = await crearApoyoPendiente(db, "mensual", 500);
    expect((await leerApoyo(db, id))?.estado).toBe("pendiente");
    await activarApoyo(db, id, "Ana");
    await activarApoyo(db, id, "Otro nombre");
    expect(await leerApoyo(db, id)).toMatchObject({ estado: "activo", nombre: "Ana" });

    const cobro = { id: "in_1", apoyoId: id, importeCent: 500, pago: null };
    expect(await registrarCobro(db, cobro)).toBe(true);
    expect(await registrarCobro(db, { ...cobro, pago: "pi_1" })).toBe(true);
    const filas = await db.query<{ n: number; pago: string }>(
      "select count(*)::int as n, max(pago) as pago from apoyo_cobros",
    );
    expect(filas[0]).toEqual({ n: 1, pago: "pi_1" });
    expect(await registrarCobro(db, { ...cobro, id: "in_x", apoyoId: "no-existe" })).toBe(false);
  });

  it("un cobro que llega antes que la activación también activa el apoyo", async () => {
    const id = await crearApoyoPendiente(db, "mensual", 200);
    await registrarCobro(db, { id: "in_9", apoyoId: id, importeCent: 200, pago: "pi_9" });
    expect((await leerApoyo(db, id))?.estado).toBe("activo");
  });

  it("cancelar un mensual no borra lo cobrado; devolver un pago sí", async () => {
    const id = await apoyar("mensual", 500, "Ana", { id: "in_a", pago: "pi_a" });
    await registrarCobro(db, { id: "in_b", apoyoId: id, importeCent: 500, pago: "pi_b" });
    await cancelarApoyo(db, id);
    let t = await tablon(db, { desde: null, ocultos: new Set() });
    expect(t).toMatchObject({ totalCent: 1000, mensualesActivos: 0, personas: 1 });

    expect(await devolverCobroPorPago(db, "pi_b")).toBe(1);
    t = await tablon(db, { desde: null, ocultos: new Set() });
    expect(t.totalCent).toBe(500);
    // Devolver el último cobro vivo lo saca del tablón
    await devolverCobroPorPago(db, "pi_a");
    t = await tablon(db, { desde: null, ocultos: new Set() });
    expect(t).toMatchObject({ personas: 0, top: [], ultimos: [] });
  });
});

describe("tablón (HU-5.5)", () => {
  it("top por lo aportado sin importes, últimos por fecha y anónimos aparte", async () => {
    const dia = (d: number) => new Date(Date.UTC(2026, 9, d, 10));
    const ana = await apoyar("mensual", 200, "Ana", { id: "in_1", pago: "pi_1", cobrado: dia(1) });
    await registrarCobro(db, { id: "in_2", apoyoId: ana, importeCent: 200, pago: "pi_2", cobrado: dia(2) });
    await registrarCobro(db, { id: "in_3", apoyoId: ana, importeCent: 200, pago: "pi_3", cobrado: dia(3) });
    await apoyar("puntual", 300, "Luis", { id: "pi_4", pago: "pi_4", cobrado: dia(4) });
    await apoyar("puntual", 1000, null, { id: "pi_5", pago: "pi_5", cobrado: dia(5) });
    const oculto = await apoyar("puntual", 2500, "Nombre oculto", { id: "pi_6", pago: "pi_6" });
    // El mismo nombre en dos apoyos suma como una persona y sale una vez
    await apoyar("puntual", 300, "luis", { id: "pi_7", pago: "pi_7" });

    const t = await tablon(db, { desde: null, ocultos: new Set([oculto]) });
    expect(t.top).toEqual(["Ana", "Luis"]); // 6 € frente a 6 €: empata y va antes quien empezó antes
    expect(t.ultimos.map((u) => u.nombre)).toEqual(["luis", "Ana"]);
    expect(t.ultimos[1]).toMatchObject({ tipo: "mensual" });
    expect(t).toMatchObject({ anonimos: 2, personas: 5, mensualesActivos: 1, totalCent: 4700, cobros: 7 });
    // Ningún importe por persona sale del tablón
    expect(JSON.stringify({ top: t.top, ultimos: t.ultimos })).not.toMatch(/200|300|600/);
  });

  it("«este mes» solo cuenta los cobros desde el día 1", async () => {
    const id = await apoyar("mensual", 500, "Ana", { id: "in_v", pago: "pi_v", cobrado: new Date("2026-09-15T10:00:00Z") });
    await registrarCobro(db, { id: "in_n", apoyoId: id, importeCent: 500, pago: "pi_n", cobrado: new Date("2026-10-02T10:00:00Z") });
    const desde = inicioDeMes(new Date("2026-10-08T12:00:00Z"));
    expect(desde.toISOString()).toBe("2026-09-30T22:00:00.000Z"); // 1 de octubre en hora de España
    expect((await tablon(db, { desde, ocultos: new Set() })).totalCent).toBe(500);
    expect((await tablon(db, { desde: null, ocultos: new Set() })).totalCent).toBe(1000);
  });
});

describe("cuentas (HU-5.3)", () => {
  it("costes fijos prorrateados y comisiones estimadas", () => {
    const fijos = [
      { id: "servidor", nombre: "Servidor", euros_mes: 8, actualizado: "2026-10-08" },
      { id: "dominio", nombre: "Dominio", euros_ano: 14, actualizado: "2026-10-08" },
      { id: "x", nombre: "Sin cifra", actualizado: "2026-10-08" },
    ];
    expect(fijos.map(centMensual)).toEqual([800, 117, null]);
    expect(fijosMensualCent(fijos)).toBe(917);
    expect(comisionEstimadaCent(1000, 2)).toBe(65);
  });

  it("IA de los últimos 30 días y bonos activos", async () => {
    // Gratis y pago de hoy cuentan; lo de hace 40 días, no
    await db.exec(`delete from uso_diario;
      insert into uso_diario (fecha, tipo, coste_usd) values
        (current_date, 'gratis', 1.25), (current_date, 'pago', 0.5),
        (current_date - 40, 'gratis', 9);`);
    expect(await iaUltimos30Usd(db)).toBeCloseTo(1.75);

    const b25 = planPorId("b25")!;
    const id = await crearBonoPendiente(db, b25, "VC-TEST-0000-0001");
    await activarBono(db, id, "pi_bono");
    await crearBonoPendiente(db, b25, "VC-TEST-0000-0002"); // pendiente: no cuenta
    expect(await ingresosBonos(db, null)).toEqual({ cent: 99, cobros: 1 });
  });
});
