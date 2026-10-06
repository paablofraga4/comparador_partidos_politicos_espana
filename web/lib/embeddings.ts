import { createOpenAI } from "@ai-sdk/openai";
import { embed, embedMany } from "ai";

import type { Embedder } from "./indice";

function modelo() {
  const nombre = process.env.OPENAI_EMBEDDING_MODEL;
  if (!nombre) throw new Error("Falta OPENAI_EMBEDDING_MODEL (config/models.env)");
  return createOpenAI({ apiKey: process.env.OPENAI_API_KEY }).embedding(nombre);
}

const opciones = () => ({
  openai: { dimensions: Number(process.env.OPENAI_EMBEDDING_DIMENSIONS ?? 1536) },
});

export const embedderOpenAI: Embedder = async (textos) => {
  const r = await embedMany({ model: modelo(), values: textos, providerOptions: opciones() });
  return { embeddings: r.embeddings, tokens: r.usage?.tokens ?? 0 };
};

/** Embedding de la consulta del chat. Si falla (sin clave o sin crédito), búsqueda solo léxica. */
export async function embedConsulta(texto: string): Promise<number[] | null> {
  try {
    const r = await embed({ model: modelo(), value: texto, providerOptions: opciones() });
    return r.embedding;
  } catch {
    return null;
  }
}
