import { createOpenAI } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
} from "ai";

import { herramientas } from "@/lib/chat/herramientas";
import { contarYComprobar, presupuestoAgotado, registrarUso } from "@/lib/chat/limites";
import { instrucciones } from "@/lib/chat/prompt";
import type { MensajeChat } from "@/lib/chat/tipos";
import { cargarConfigModelos, numeroEnv } from "@/lib/config";
import { getDb, hayDb } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 60;

cargarConfigModelos();

/** Respuesta fija sin llamar al modelo (límites, pausas): se ve como un mensaje normal. */
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

function mensajeError(e: unknown): string {
  const t = String((e as { message?: string })?.message ?? e);
  if (/insufficient_quota|credit_balance|hard limit/i.test(t)) {
    return "El asistente está en pausa porque ha llegado a su límite de uso. El comparador sigue funcionando con normalidad.";
  }
  return "Ha habido un problema al preparar la respuesta. Inténtalo de nuevo en unos segundos.";
}

function ipCliente(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  return (xff?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "local").trim();
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
  if (!esEval) {
    const limite = await contarYComprobar(db, ipCliente(req));
    if (!limite.ok) return respuestaFija(limite.mensaje);
  }
  if (await presupuestoAgotado(db)) {
    return respuestaFija(
      "El asistente ha llegado a su límite de uso de hoy y vuelve mañana. El comparador sigue funcionando con normalidad.",
    );
  }

  const filtro = (body.candidaturas ?? []).filter((x) => /^[a-z0-9-]{1,40}$/.test(x)).slice(0, 20);
  const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const stream = createUIMessageStream<MensajeChat>({
    execute: async ({ writer }) => {
      writer.write({ type: "start" });
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
        providerOptions: {
          openai: { reasoningEffort: process.env.OPENAI_REASONING_CHAT || "low", store: false },
        },
        onEnd: async ({ steps }) => {
          const uso = steps.reduce(
            (acc, s) => ({
              entrada: acc.entrada + (s.usage?.inputTokens ?? 0),
              cache: acc.cache + (s.usage?.inputTokenDetails?.cacheReadTokens ?? 0),
              salida: acc.salida + (s.usage?.outputTokens ?? 0),
            }),
            { entrada: 0, cache: 0, salida: 0 },
          );
          await registrarUso(db, uso).catch(() => {});
        },
      });
      writer.merge(
        toUIMessageStream({ stream: result.stream, sendStart: false, onError: mensajeError }),
      );
    },
    onError: mensajeError,
  });
  return createUIMessageStreamResponse({ stream });
}
