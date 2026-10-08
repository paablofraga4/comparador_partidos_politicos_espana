/**
 * Pasarela de los apoyos (spec 005, HU-5.4 y HU-5.7; plan técnico D17): Stripe Checkout en
 * producción y una simulada para desarrollo. El apoyo se reconoce por `apoyo_id` en los
 * metadatos; no guardamos ids de cliente ni de suscripción.
 */
import Stripe from "stripe";

import { euros } from "../bonos/planes";
import { estadoApoyos, type TipoApoyo } from "./config";

export type Cobro = { id: string; importeCent: number; pago: string | null };
export type SesionApoyo = { id: string; url: string };
export type EstadoSesionApoyo = {
  pagada: boolean;
  apoyoId: string | null;
  /** Lo que escribió la persona, sin filtrar */
  nombre: string | null;
  cobro: Cobro | null;
};

/** Eventos de apoyo que entiende el webhook (los de bonos están en lib/bonos/pasarela.ts). */
export type EventoApoyo =
  | { tipo: "apoyo-pagado"; apoyoId: string; nombre: string | null; cobro: Cobro | null }
  | { tipo: "apoyo-cobrado"; apoyoId: string; cobro: Cobro }
  | { tipo: "apoyo-cancelado"; apoyoId: string };

export interface PasarelaApoyos {
  crearSesion(a: {
    apoyoId: string;
    tipo: TipoApoyo;
    importeCent: number;
    urlBase: string;
  }): Promise<SesionApoyo>;
  leerSesion(id: string): Promise<EstadoSesionApoyo>;
}

export const DECLARACION_NEUTRAL =
  "Lo confirmo: ni partido, candidatura, fundación vinculada, candidato ni cargo público";

export function avisoApoyo(tipo: TipoApoyo, importeCent: number, urlBase: string): string {
  const cuanto = tipo === "mensual" ? `de ${euros(importeCent)} al mes` : `de ${euros(importeCent)}`;
  return [
    `Es una aportación voluntaria ${cuanto}, no una compra, y no desgrava: VotoClaro no es una asociación ni una fundación.`,
    tipo === "mensual" ? "Puedes cancelarla cuando quieras desde la página de apoyos." : "",
    "No se aceptan aportaciones de partidos, candidaturas, sus fundaciones, candidatos ni cargos públicos.",
    `Condiciones: ${urlBase}/condiciones#apoyos`,
  ]
    .filter(Boolean)
    .join(" ");
}

const idDe = (x: string | { id: string } | null | undefined): string | null =>
  typeof x === "string" ? x : (x?.id ?? null);

function nombreDeSesion(s: Stripe.Checkout.Session): string | null {
  return s.custom_fields?.find((c) => c.key === "nombre")?.text?.value ?? null;
}

/** Primer cobro de una sesión: el pago único o la primera factura del apoyo mensual. */
function cobroDeSesion(s: Stripe.Checkout.Session): Cobro | null {
  const importeCent = s.amount_total ?? 0;
  if (s.mode === "subscription") {
    const factura = idDe(s.invoice);
    return factura ? { id: factura, importeCent, pago: null } : null;
  }
  const pago = idDe(s.payment_intent);
  return pago ? { id: pago, importeCent, pago } : null;
}

// --- Stripe --------------------------------------------------------------------------------

function stripe(): Stripe {
  return new Stripe(process.env.STRIPE_SECRET_KEY ?? "");
}

function pasarelaStripe(): PasarelaApoyos {
  const s = stripe();
  return {
    async crearSesion({ apoyoId, tipo, importeCent, urlBase }) {
      const mensual = tipo === "mensual";
      const nombre = mensual ? "Apoyo mensual a VotoClaro" : "Apoyo a VotoClaro";
      const sesion = await s.checkout.sessions.create({
        mode: mensual ? "subscription" : "payment",
        locale: "es",
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "eur",
              unit_amount: importeCent,
              ...(mensual ? { recurring: { interval: "month" as const } } : {}),
              product_data: {
                name: nombre,
                description: "Ayuda a cubrir el servidor, la IA del chat y el dominio.",
              },
            },
          },
        ],
        metadata: { apoyo_id: apoyoId, tipo },
        ...(mensual
          ? { subscription_data: { description: nombre, metadata: { apoyo_id: apoyoId } } }
          : {
              submit_type: "donate" as const,
              payment_intent_data: { description: nombre, metadata: { apoyo_id: apoyoId } },
            }),
        custom_fields: [
          {
            key: "nombre",
            type: "text",
            optional: true,
            label: { type: "custom", custom: "Nombre o alias para el tablón" },
            text: { maximum_length: 40 },
          },
          {
            key: "neutral",
            type: "dropdown",
            optional: false,
            label: { type: "custom", custom: "No aporto en nombre de un partido" },
            dropdown: { options: [{ label: DECLARACION_NEUTRAL, value: "confirmo" }] },
          },
        ],
        custom_text: { submit: { message: avisoApoyo(tipo, importeCent, urlBase) } },
        success_url: `${urlBase}/api/apoyos/confirmar?sesion={CHECKOUT_SESSION_ID}`,
        cancel_url: `${urlBase}/apoya?pago=cancelado#apoyar`,
      });
      if (!sesion.url) throw new Error("Stripe no ha devuelto la URL de pago");
      return { id: sesion.id, url: sesion.url };
    },
    async leerSesion(id) {
      const sesion = await s.checkout.sessions.retrieve(id);
      return {
        pagada: sesion.payment_status === "paid",
        apoyoId: sesion.metadata?.apoyo_id ?? null,
        nombre: nombreDeSesion(sesion),
        cobro: cobroDeSesion(sesion),
      };
    },
  };
}

/**
 * Traduce un evento de Stripe ya verificado (lo verifica lib/bonos/pasarela.ts, que comparte el
 * webhook). null si el evento no es de apoyos.
 */
export async function eventoApoyoStripe(ev: Stripe.Event): Promise<EventoApoyo | null> {
  if (ev.type === "checkout.session.completed" || ev.type === "checkout.session.async_payment_succeeded") {
    const sesion = ev.data.object;
    const apoyoId = sesion.metadata?.apoyo_id;
    if (!apoyoId || sesion.payment_status !== "paid") return null;
    return { tipo: "apoyo-pagado", apoyoId, nombre: nombreDeSesion(sesion), cobro: cobroDeSesion(sesion) };
  }
  if (ev.type === "invoice.paid") {
    const factura = ev.data.object;
    const apoyoId = factura.parent?.subscription_details?.metadata?.apoyo_id;
    if (!apoyoId || !factura.id || factura.amount_paid <= 0) return null;
    // El PaymentIntent no viene en la factura: hace falta para reconocer las devoluciones. Si la
    // clave no puede leer facturas, el cobro cuenta igual (solo se pierde el enlace al reembolso)
    let pago: string | null = null;
    try {
      const pagos = await stripe().invoicePayments.list({ invoice: factura.id, limit: 1 });
      pago = idDe(pagos.data[0]?.payment.payment_intent);
    } catch (e) {
      console.error("⚠ sin permiso para leer los pagos de la factura:", (e as Error).message);
    }
    return { tipo: "apoyo-cobrado", apoyoId, cobro: { id: factura.id, importeCent: factura.amount_paid, pago } };
  }
  if (ev.type === "customer.subscription.deleted") {
    const apoyoId = ev.data.object.metadata?.apoyo_id;
    return apoyoId ? { tipo: "apoyo-cancelado", apoyoId } : null;
  }
  return null;
}

// --- Simulada (solo desarrollo) --------------------------------------------------------------

export type SesionSimuladaApoyo = {
  apoyoId: string;
  tipo: TipoApoyo;
  importeCent: number;
  pagada: boolean;
  nombre: string | null;
};
const g = globalThis as unknown as { __vcApoyosSimulados?: Map<string, SesionSimuladaApoyo> };
export const sesionesApoyoSimuladas = () => (g.__vcApoyosSimulados ??= new Map());

function pasarelaSimulada(): PasarelaApoyos {
  return {
    async crearSesion({ apoyoId, tipo, importeCent, urlBase }) {
      const id = `sim_${apoyoId}`;
      sesionesApoyoSimuladas().set(id, { apoyoId, tipo, importeCent, pagada: false, nombre: null });
      return { id, url: `${urlBase}/api/apoyos/simulada?sesion=${id}` };
    },
    async leerSesion(id) {
      const s = sesionesApoyoSimuladas().get(id);
      return {
        pagada: !!s?.pagada,
        apoyoId: s?.apoyoId ?? null,
        nombre: s?.nombre ?? null,
        cobro: s ? { id: `cobro_sim_${s.apoyoId}_1`, importeCent: s.importeCent, pago: `pi_sim_${s.apoyoId}_1` } : null,
      };
    },
  };
}

export function pasarelaApoyos(): PasarelaApoyos | null {
  const estado = estadoApoyos();
  if (!estado.activos) return null;
  return estado.pasarela === "stripe" ? pasarelaStripe() : pasarelaSimulada();
}
