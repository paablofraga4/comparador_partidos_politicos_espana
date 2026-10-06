import type { UIMessage } from "ai";

import type { FuenteChat } from "./refs";

/** Mensajes del chat: las fuentes registradas viajan como partes de datos «data-fuente». */
export type MensajeChat = UIMessage<never, { fuente: FuenteChat }>;
