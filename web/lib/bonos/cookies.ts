/**
 * Cookies técnicas del chat (spec 004). No rastrean: la de cuota es aleatoria y solo cuenta
 * preguntas gratis; la de bono guarda el código que la persona ha comprado.
 */
import { CADUCIDAD_BONOS } from "./planes";

export const COOKIE_USO = "vc_uso";
export const COOKIE_BONO = "vc_bono";

const base = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
});

/** La de cuota solo viaja a /api (no hace falta en ninguna página). */
export const opcionesUso = () => ({ ...base(), path: "/api", expires: CADUCIDAD_BONOS });
export const opcionesBono = (caduca = CADUCIDAD_BONOS) => ({
  ...base(),
  path: "/",
  expires: caduca,
});

export const valorUsoValido = (v: string | undefined): v is string =>
  !!v && /^[0-9a-z]{24}$/.test(v);
