import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { presupuestoAgotado, registrarUso } from "../chat/limites";
import { getDb, type Db } from "../db";
import { migrar } from "../indice";
import { hashCodigo, nuevoCodigo, normalizarCodigo } from "./codigos";
import {
  activarBono,
  anularPorPago,
  bonoPorCodigo,
  crearBonoPendiente,
  devolverBono,
  devolverGratis,
  intentoCanje,
  reservarBono,
  reservarGratis,
  reservarIp,
  usadasGratis,
} from "./cupo";
import { estadoPagos } from "./pagos";
import { centimosPorPregunta, euros, PLANES, planPorId } from "./planes";

const MIGRACIONES = path.resolve(__dirname, "..", "..", "db", "migraciones");
let db: Db;

beforeAll(async () => {
  db = await getDb("pglite:memory");
  await migrar(db, MIGRACIONES);
});
afterAll(async () => db.end());

describe("códigos", () => {
  it("genera códigos canónicos y normaliza lo que escribe la gente", () => {
    const c = nuevoCodigo();
    expect(c).toMatch(/^VC-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/);
    expect(normalizarCodigo(c.toLowerCase().replace(/-/g, " "))).toBe(c);
    expect(normalizarCodigo("vc-0o1i-L234-5678")).toBe("VC-0011-1234-5678");
    expect(normalizarCodigo("VC-1234")).toBeNull();
    expect(normalizarCodigo("VC-UUUU-1234-5678")).toBeNull();
  });
});

describe("planes", () => {
  it("precios con IVA y céntimos por pregunta", () => {
    // Intl separa importe y símbolo con un espacio no separable
    const precios = PLANES.map((p) => euros(p.precioCent).replace(/\s/g, " "));
    expect(precios).toEqual(["0,99 €", "2,99 €", "4,99 €"]);
    expect(PLANES.map(centimosPorPregunta)).toEqual(["4", "3", "2,5"]);
    expect(planPorId("b100")?.preguntas).toBe(100);
    expect(planPorId("gratis")).toBeNull();
  });
});

describe("preguntas gratis", () => {
  it("2 por navegador en total, y la devolución libera una", async () => {
    expect(await reservarGratis(db, "navegador-a", 2)).toBe(1);
    expect(await reservarGratis(db, "navegador-a", 2)).toBe(2);
    expect(await reservarGratis(db, "navegador-a", 2)).toBeNull();
    await devolverGratis(db, "navegador-a");
    expect(await usadasGratis(db, "navegador-a")).toBe(1);
    expect(await reservarGratis(db, "navegador-b", 2)).toBe(1);
  });

  it("techo diario por IP aunque se borren las cookies", async () => {
    const hoy = new Date("2026-10-07T10:00:00Z");
    for (let i = 1; i <= 6; i++) expect(await reservarIp(db, "1.2.3.4", 6, hoy)).toBe(i);
    expect(await reservarIp(db, "1.2.3.4", 6, hoy)).toBeNull();
    expect(await reservarIp(db, "1.2.3.4", 6, new Date("2026-10-08T10:00:00Z"))).toBe(1);
    expect(await reservarIp(db, "5.6.7.8", 6, hoy)).toBe(1);
  });
});

describe("bonos", () => {
  const ahora = new Date("2026-10-07T10:00:00Z");

  it("pendiente → activo (idempotente) → se gasta hasta su total", async () => {
    const plan = { ...planPorId("b25")!, preguntas: 3, porHora: 10 };
    const codigo = nuevoCodigo();
    const id = await crearBonoPendiente(db, plan, codigo);
    expect((await reservarBono(db, codigo, ahora)).ok).toBe(false); // aún sin pagar
    expect((await activarBono(db, id, "pi_1"))?.estado).toBe("activo");
    expect((await activarBono(db, id, "pi_1"))?.estado).toBe("activo"); // confirmar + webhook
    for (let i = 0; i < 3; i++) expect((await reservarBono(db, codigo, ahora)).ok).toBe(true);
    const r = await reservarBono(db, codigo, ahora);
    expect(r.ok === false && r.motivo).toBe("agotado");
    await devolverBono(db, id, ahora);
    expect((await reservarBono(db, codigo, ahora)).ok).toBe(true);
  });

  it("respeta el máximo por hora del plan y no lo cobra", async () => {
    const plan = { ...planPorId("b25")!, preguntas: 25, porHora: 2 };
    const codigo = nuevoCodigo();
    const id = await crearBonoPendiente(db, plan, codigo);
    await activarBono(db, id, "pi_2");
    expect((await reservarBono(db, codigo, ahora)).ok).toBe(true);
    expect((await reservarBono(db, codigo, ahora)).ok).toBe(true);
    const r = await reservarBono(db, codigo, ahora);
    expect(r.ok === false && r.motivo).toBe("hora");
    expect((await bonoPorCodigo(db, codigo))?.usadas).toBe(2);
    expect((await reservarBono(db, codigo, new Date("2026-10-07T11:05:00Z"))).ok).toBe(true);
  });

  it("caduca y se anula al devolver el pago", async () => {
    const plan = planPorId("b100")!;
    const c1 = nuevoCodigo();
    const id1 = await crearBonoPendiente(db, plan, c1, new Date("2026-10-07T09:00:00Z"));
    await activarBono(db, id1, "pi_3");
    const r1 = await reservarBono(db, c1, ahora);
    expect(r1.ok === false && r1.motivo).toBe("caducado");

    const c2 = nuevoCodigo();
    const id2 = await crearBonoPendiente(db, plan, c2);
    await activarBono(db, id2, "pi_4");
    expect(await anularPorPago(db, "pi_4")).toBe(1);
    const r2 = await reservarBono(db, c2, ahora);
    expect(r2.ok === false && r2.motivo).toBe("anulado");
    expect(await activarBono(db, id2, "pi_4")).toBeNull(); // un webhook tardío no lo reactiva
  });

  it("no guarda el código en claro", async () => {
    const codigo = nuevoCodigo();
    await crearBonoPendiente(db, planPorId("b200")!, codigo);
    const filas = await db.query<{ codigo_hash: string }>("select codigo_hash from bonos");
    expect(filas.some((f) => f.codigo_hash === hashCodigo(codigo))).toBe(true);
    expect(JSON.stringify(filas)).not.toContain(codigo);
  });

  it("limita los intentos de canje por IP", async () => {
    for (let i = 0; i < 3; i++) expect(await intentoCanje(db, "9.9.9.9", 3, ahora)).toBe(true);
    expect(await intentoCanje(db, "9.9.9.9", 3, ahora)).toBe(false);
  });
});

describe("presupuestos separados", () => {
  it("el tope gratis no para el de pago", async () => {
    process.env.OPENAI_PRICE_CHAT = "2.00,0.10,10.00";
    process.env.CHAT_DAILY_BUDGET_USD = "0.01";
    await registrarUso(db, { entrada: 10_000, cache: 0, salida: 0 }, "gratis"); // 0,02 $
    expect(await presupuestoAgotado(db, "gratis")).toBe(true);
    expect(await presupuestoAgotado(db, "pago")).toBe(false);
  });
});

describe("salvaguardas de los pagos", () => {
  const stripe = { STRIPE_SECRET_KEY: "sk_test_x", STRIPE_WEBHOOK_SECRET: "whsec_x" };
  const titular = { TITULAR_NOMBRE: "Nombre", TITULAR_NIF: "00000000T", TITULAR_EMAIL: "a@b.es" };

  it("apagados por defecto", () => {
    expect(estadoPagos({}).activos).toBe(false);
  });
  it("sin titular no se puede cobrar", () => {
    const e = estadoPagos({ PAGOS_ACTIVOS: "1", ...stripe });
    expect(e.activos === false && e.motivo).toBe("faltan los datos del titular");
  });
  it("con todo, Stripe", () => {
    expect(estadoPagos({ PAGOS_ACTIVOS: "1", ...stripe, ...titular })).toEqual({
      activos: true,
      pasarela: "stripe",
    });
  });
  it("la simulada nunca en producción", () => {
    const sim = { PAGOS_ACTIVOS: "1", PAGOS_PASARELA: "simulada" };
    expect(estadoPagos({ ...sim, NODE_ENV: "development" }).activos).toBe(true);
    expect(estadoPagos({ ...sim, NODE_ENV: "production", ...stripe, ...titular }).activos).toBe(
      false,
    );
  });
});
