/**
 * Interruptor de los pagos y salvaguardas (spec 004, HU-4.8): con PAGOS_ACTIVOS=1 pero sin
 * claves de Stripe o sin los datos del titular (LSSI art. 10), los pagos siguen apagados.
 */
type Env = Record<string, string | undefined>;

export type Titular = { nombre: string; nif: string; email: string };

export type EstadoPagos =
  { activos: true; pasarela: "stripe" | "simulada" } | { activos: false; motivo: string };

export function titular(env: Env = process.env): Titular | null {
  const nombre = env.TITULAR_NOMBRE?.trim();
  const nif = env.TITULAR_NIF?.trim();
  const email = env.TITULAR_EMAIL?.trim();
  return nombre && nif && email ? { nombre, nif, email } : null;
}

export function estadoPagos(env: Env = process.env): EstadoPagos {
  if (env.PAGOS_ACTIVOS !== "1") return { activos: false, motivo: "apagados" };
  // La pasarela simulada no cobra nada: solo en desarrollo y nunca en producción
  if (env.PAGOS_PASARELA === "simulada") {
    return env.NODE_ENV === "production"
      ? { activos: false, motivo: "la pasarela simulada no se usa en producción" }
      : { activos: true, pasarela: "simulada" };
  }
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET) {
    return { activos: false, motivo: "faltan las claves de Stripe" };
  }
  if (!titular(env)) return { activos: false, motivo: "faltan los datos del titular" };
  return { activos: true, pasarela: "stripe" };
}
