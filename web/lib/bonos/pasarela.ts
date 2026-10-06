/**
 * Pasarelas de pago (spec 004, HU-4.5 y HU-4.7): Stripe Checkout en producción y una simulada
 * para probar el flujo completo en desarrollo sin cobrar nada. Solo hablan de sesiones y
 * eventos; la lógica de bonos vive en cupo.ts.
 */
import Stripe from "stripe";

import { estadoPagos } from "./pagos";
import { fechaCaducidad, type Plan } from "./planes";

export type SesionPago = { id: string; url: string };
export type EstadoSesion = {
  pagada: boolean;
  bonoId: string | null;
  codigo: string | null;
  pago: string | null;
};
export type EventoPago =
  | { tipo: "pagado"; bonoId: string; pago: string | null }
  | { tipo: "devuelto"; pago: string }
  | { tipo: "otro" };

export interface Pasarela {
  crearSesion(a: {
    bonoId: string;
    codigo: string;
    plan: Plan;
    urlBase: string;
  }): Promise<SesionPago>;
  leerSesion(id: string): Promise<EstadoSesion>;
  leerEvento(cuerpo: string, firma: string | null): Promise<EventoPago>;
}

export const AVISO_DESISTIMIENTO =
  "El bono se activa en cuanto pagas. Al tratarse de contenido digital que empiezas a usar al momento, aceptas su ejecución inmediata y renuncias al derecho de desistimiento (art. 103.m de la Ley General para la Defensa de los Consumidores).";

function idPago(pi: string | { id: string } | null | undefined): string | null {
  return typeof pi === "string" ? pi : (pi?.id ?? null);
}

// --- Stripe --------------------------------------------------------------------------------

function pasarelaStripe(): Pasarela {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");
  return {
    async crearSesion({ bonoId, codigo, plan, urlBase }) {
      const s = await stripe.checkout.sessions.create({
        mode: "payment",
        locale: "es",
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "eur",
              unit_amount: plan.precioCent,
              product_data: {
                // El código aparece en el recibo de Stripe: así se puede recuperar
                name: `VotoClaro · ${plan.nombre} · código ${codigo}`,
                description: `${plan.preguntas} preguntas al asistente de VotoClaro. Válido hasta el ${fechaCaducidad()}.`,
              },
            },
          },
        ],
        metadata: { bono_id: bonoId, codigo, plan: plan.id },
        payment_intent_data: {
          description: `VotoClaro · ${plan.nombre} · código ${codigo}`,
          metadata: { bono_id: bonoId },
        },
        custom_text: {
          submit: { message: `${AVISO_DESISTIMIENTO} Condiciones: ${urlBase}/condiciones` },
        },
        success_url: `${urlBase}/api/bonos/confirmar?sesion={CHECKOUT_SESSION_ID}`,
        cancel_url: `${urlBase}/pregunta?pago=cancelado`,
      });
      if (!s.url) throw new Error("Stripe no ha devuelto la URL de pago");
      return { id: s.id, url: s.url };
    },
    async leerSesion(id) {
      const s = await stripe.checkout.sessions.retrieve(id);
      return {
        pagada: s.payment_status === "paid",
        bonoId: s.metadata?.bono_id ?? null,
        codigo: s.metadata?.codigo ?? null,
        pago: idPago(s.payment_intent),
      };
    },
    async leerEvento(cuerpo, firma) {
      const ev = stripe.webhooks.constructEvent(
        cuerpo,
        firma ?? "",
        process.env.STRIPE_WEBHOOK_SECRET ?? "",
      );
      if (
        ev.type === "checkout.session.completed" ||
        ev.type === "checkout.session.async_payment_succeeded"
      ) {
        const s = ev.data.object;
        if (s.payment_status === "paid" && s.metadata?.bono_id) {
          return { tipo: "pagado", bonoId: s.metadata.bono_id, pago: idPago(s.payment_intent) };
        }
      }
      if (ev.type === "charge.refunded") {
        const c = ev.data.object;
        const pago = idPago(c.payment_intent);
        // Solo la devolución completa anula el bono
        if (c.refunded && pago) return { tipo: "devuelto", pago };
      }
      return { tipo: "otro" };
    },
  };
}

// --- Simulada (solo desarrollo) --------------------------------------------------------------

type SesionSimulada = { bonoId: string; codigo: string; pagada: boolean; pago: string };
const g = globalThis as unknown as { __vcPagosSimulados?: Map<string, SesionSimulada> };
export const sesionesSimuladas = () => (g.__vcPagosSimulados ??= new Map());

function pasarelaSimulada(): Pasarela {
  return {
    async crearSesion({ bonoId, codigo, urlBase }) {
      const id = `sim_${bonoId}`;
      sesionesSimuladas().set(id, { bonoId, codigo, pagada: false, pago: `pi_sim_${bonoId}` });
      return { id, url: `${urlBase}/api/bonos/simulada?sesion=${id}` };
    },
    async leerSesion(id) {
      const s = sesionesSimuladas().get(id);
      return {
        pagada: !!s?.pagada,
        bonoId: s?.bonoId ?? null,
        codigo: s?.codigo ?? null,
        pago: s?.pago ?? null,
      };
    },
    async leerEvento(cuerpo) {
      // Sin firma: solo existe en desarrollo (estadoPagos la bloquea en producción)
      const e = JSON.parse(cuerpo) as { tipo?: string; pago?: string };
      return e.tipo === "devuelto" && e.pago
        ? { tipo: "devuelto", pago: e.pago }
        : { tipo: "otro" };
    },
  };
}

export function pasarela(): Pasarela | null {
  const estado = estadoPagos();
  if (!estado.activos) return null;
  return estado.pasarela === "stripe" ? pasarelaStripe() : pasarelaSimulada();
}
