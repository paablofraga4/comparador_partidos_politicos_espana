import { createOpenAI } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
} from "ai";
import { cookies } from "next/headers";

import { nuevoId } from "@/lib/bonos/codigos";
import { COOKIE_BONO, COOKIE_USO, opcionesUso, valorUsoValido } from "@/lib/bonos/cookies";
import {
  devolverBono,
  devolverGratis,
  devolverIp,
  reservarBono,
  reservarGratis,
  reservarIp,
} from "@/lib/bonos/cupo";
import { herramientas } from "@/lib/chat/herramientas";
import { presupuestoAgotado, registrarUso, type TipoUso } from "@/lib/chat/limites";
import { instrucciones } from "@/lib/chat/prompt";
import type { CupoChat, LimiteChat, MensajeChat, MotivoLimite } from "@/lib/chat/tipos";
import { cargarConfigModelos, numeroEnv } from "@/lib/config";
import { getDb, hayDb, type Db } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 60;

cargarConfigModelos();

/** Respuesta fija sin llamar al modelo (pausas, conversación larga): se ve como un mensaje. */
function respuestaFija(texto: string) {
  const stream = createUIMessageStream<MensajeChat>({
    execute: ({ writer }) => {
      writer.write({ type: "start" });
      writer.write({ type: "text-start", id: "aviso" });
      writer.write({ type: "text-delta", id: "aviso", delta: texto });
      writer.write({ type: "text-end", id: "aviso" });
      writer.write({ type: "finish" });
    },
  });
  return createUIMessageStreamResponse({ stream });
}

/** Sin cupo (spec 004, HU-4.3): la interfaz pinta la tarjeta de planes con este motivo. */
function respuestaLimite(motivo: MotivoLimite, bonoTerminado = false) {
  const data: LimiteChat = {
    motivo,
    gratisTotal: numeroEnv("CHAT_GRATIS_TOTAL", 2),
    bonoTerminado,
  };
  const stream = createUIMessageStream<MensajeChat>({
    execute: ({ writer }) => {
      writer.write({ type: "start" });
      writer.write({ type: "data-limite", id: "limite", data });
      writer.write({ type: "finish" });
    },
  });
  return createUIMessageStreamResponse({ stream });
}

function mensajeError(e: unknown): string {
  const err = e as { message?: string; responseBody?: string };
  const t = `${err?.message ?? e} ${err?.responseBody ?? ""}`;
  if (/insufficient_quota|credit_balance|no credits|hard limit|spend limit/i.test(t)) {
    return "El asistente está en pausa porque ha llegado a su límite de uso. El comparador sigue funcionando con normalidad.";
  }
  if (/api key/i.test(t)) {
    return "El asistente no está disponible en este momento. El comparador sigue funcionando con normalidad.";
  }
  return "Ha habido un problema al preparar la respuesta. No se ha descontado de tus preguntas. Inténtalo de nuevo en unos segundos.";
}

function ipCliente(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  return (xff?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "local").trim();
}

type Reserva =
  | { tipo: "gratis"; cookie: string; ip: string; cupo: CupoChat }
  | { tipo: "bono"; id: string; cupo: CupoChat };

async function devolver(db: Db, r: Reserva) {
  if (r.tipo === "bono") return devolverBono(db, r.id);
  await devolverGratis(db, r.cookie);
  await devolverIp(db, r.ip);
}

export async function POST(req: Request) {
  if (!hayDb() || process.env.CHAT_ACTIVO !== "1") {
    return Response.json({ error: "El asistente aún no está disponible." }, { status: 503 });
  }
  let body: { messages?: MensajeChat[]; candidaturas?: string[]; lecturaFacil?: boolean };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Petición no válida" }, { status: 400 });
  }
  const mensajes = (body.messages ?? []).slice(-12);
  const ultima = mensajes.at(-1);
  const pregunta =
    ultima?.role === "user"
      ? ultima.parts
          .map((p) => (p.type === "text" ? p.text : ""))
          .join(" ")
          .trim()
      : "";
  const maxChars = numeroEnv("CHAT_MAX_QUESTION_CHARS", 500);
  if (!pregunta) return Response.json({ error: "Falta la pregunta" }, { status: 400 });
  if (pregunta.length > maxChars) {
    return respuestaFija(`La pregunta es demasiado larga (máximo ${maxChars} caracteres).`);
  }
  if (mensajes.filter((m) => m.role === "user").length > 10) {
    return respuestaFija(
      "Esta conversación ya es muy larga. Empieza una nueva para seguir preguntando.",
    );
  }

  const db = await getDb();
  const token = process.env.CHAT_EVALS_TOKEN;
  const esEval = !!token && req.headers.get("x-evals-token") === token;

  // --- Cupo (spec 004): primero el bono, si lo hay; si no, las preguntas gratis ---------------
  let reserva: Reserva | null = null;
  let tipo: TipoUso = "gratis";
  if (!esEval) {
    const jar = await cookies();
    const codigo = jar.get(COOKIE_BONO)?.value;
    const rb = codigo ? await reservarBono(db, codigo) : null;
    if (rb?.ok) {
      tipo = "pago";
      reserva = {
        tipo: "bono",
        id: rb.bono.id,
        cupo: {
          tipo: "bono",
          quedan: rb.bono.total - rb.bono.usadas,
          total: rb.bono.total,
          caduca: rb.bono.caduca.toISOString(),
        },
      };
      if (await presupuestoAgotado(db, "pago")) {
        await devolverBono(db, rb.bono.id);
        return respuestaLimite("pago-presupuesto");
      }
    } else if (rb && rb.motivo === "hora") {
      return respuestaLimite("bono-hora");
    } else {
      const bonoTerminado = !!rb && (rb.motivo === "agotado" || rb.motivo === "caducado");
      if (await presupuestoAgotado(db, "gratis")) {
        return respuestaLimite("gratis-presupuesto", bonoTerminado);
      }
      let cookie = jar.get(COOKIE_USO)?.value;
      if (!valorUsoValido(cookie)) {
        cookie = nuevoId(24);
        jar.set(COOKIE_USO, cookie, opcionesUso());
      }
      const total = numeroEnv("CHAT_GRATIS_TOTAL", 2);
      const usadas = await reservarGratis(db, cookie, total);
      if (usadas === null) return respuestaLimite("gratis-agotado", bonoTerminado);
      const ip = ipCliente(req);
      if ((await reservarIp(db, ip, numeroEnv("CHAT_GRATIS_POR_IP_DIA", 6))) === null) {
        await devolverGratis(db, cookie);
        return respuestaLimite("gratis-ip", bonoTerminado);
      }
      reserva = {
        tipo: "gratis",
        cookie,
        ip,
        cupo: { tipo: "gratis", quedan: total - usadas, total },
      };
    }
  } else if (await presupuestoAgotado(db, "gratis")) {
    return respuestaFija("Tope diario alcanzado (evals).");
  }

  const filtro = (body.candidaturas ?? []).filter((x) => /^[a-z0-9-]{1,40}$/.test(x)).slice(0, 20);
  const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
  // Solo se descuenta lo que llega a responderse (o lo que la persona para a mano)
  let completada = false;
  let parada = false;

  const stream = createUIMessageStream<MensajeChat>({
    execute: async ({ writer }) => {
      writer.write({ type: "start" });
      if (reserva) writer.write({ type: "data-cupo", id: "cupo", data: reserva.cupo });
      const result = streamText({
        model: openai(process.env.OPENAI_MODEL_CHAT ?? ""),
        instructions: instrucciones({ lecturaFacil: !!body.lecturaFacil, candidaturas: filtro }),
        messages: await convertToModelMessages(mensajes),
        tools: herramientas({
          db,
          filtro,
          registrar: (f) => writer.write({ type: "data-fuente", id: f.ref, data: f }),
        }),
        stopWhen: isStepCount(5),
        maxOutputTokens: 1800,
        // Si la persona pulsa «Detener», se corta aquí (y cuenta: ya se ha usado la IA)
        abortSignal: req.signal,
        // Los 503 de saturación del proveedor llegan con el streaming ya empezado
        streamRetries: 2,
        providerOptions: {
          openai: { reasoningEffort: process.env.OPENAI_REASONING_CHAT || "low", store: false },
        },
        onAbort: () => {
          parada = true;
        },
        onEnd: async ({ steps }) => {
          completada = true;
          const uso = steps.reduce(
            (acc, s) => ({
              entrada: acc.entrada + (s.usage?.inputTokens ?? 0),
              cache: acc.cache + (s.usage?.inputTokenDetails?.cacheReadTokens ?? 0),
              salida: acc.salida + (s.usage?.outputTokens ?? 0),
            }),
            { entrada: 0, cache: 0, salida: 0 },
          );
          await registrarUso(db, uso, tipo).catch(() => {});
        },
      });
      writer.merge(
        toUIMessageStream({ stream: result.stream, sendStart: false, onError: mensajeError }),
      );
    },
    onError: mensajeError,
    onEnd: async () => {
      if (reserva && !completada && !parada) await devolver(db, reserva).catch(() => {});
    },
  });
  return createUIMessageStreamResponse({ stream });
}
