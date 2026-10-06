import type { UIMessage } from "ai";

import type { FuenteChat } from "./refs";

/** Lo que le queda a quien pregunta (spec 004, HU-4.2). */
export type CupoChat =
  | { tipo: "gratis"; quedan: number; total: number }
  | { tipo: "bono"; quedan: number; total: number; caduca: string };

/** Por qué no se ha respondido (spec 004, HU-4.3). */
export type MotivoLimite =
  "gratis-agotado" | "gratis-ip" | "gratis-presupuesto" | "bono-hora" | "pago-presupuesto";

export type LimiteChat = { motivo: MotivoLimite; gratisTotal: number; bonoTerminado: boolean };

/** Mensajes del chat: fuentes, cupo y límite viajan como partes de datos «data-…». */
export type MensajeChat = UIMessage<
  never,
  { fuente: FuenteChat; cupo: CupoChat; limite: LimiteChat }
>;
