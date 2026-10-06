"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ArrowUp, Check, Loader2, Square } from "lucide-react";
import { useMemo, useState } from "react";

import { segmentar, sinMarcaIncompleta, type FuenteChat } from "@/lib/chat/refs";
import type { MensajeChat } from "@/lib/chat/tipos";
import { CitaMark } from "./cita";

const SUGERENCIAS = [
  "¿Qué proponen los partidos sobre el precio del alquiler?",
  "¿Quién propone cambios en el IRPF?",
  "¿Qué dicen los programas sobre las listas de espera?",
  "¿Qué proponen para la jornada laboral?",
  "¿Qué medidas hay para la España vaciada?",
  "¿Qué proponen sobre inmigración?",
];

const ESTADO_HERRAMIENTA: Record<string, string> = {
  "tool-obtener_analisis": "Consultando los análisis por tema…",
  "tool-buscar_propuestas": "Buscando entre las propuestas…",
  "tool-buscar_en_programas": "Buscando en el texto de los programas…",
  "tool-listar_candidaturas": "Repasando las candidaturas…",
};

type Opcion = { id: string; corto: string; color: string };

export function Chat({ candidaturas, maxChars }: { candidaturas: Opcion[]; maxChars: number }) {
  const [seleccion, setSeleccion] = useState<string[]>([]);
  const [input, setInput] = useState("");

  const transport = useMemo(() => new DefaultChatTransport<MensajeChat>({ api: "/api/chat" }), []);
  const { messages, sendMessage, status, stop, error } = useChat<MensajeChat>({ transport });
  const ocupado = status === "submitted" || status === "streaming";

  function enviar(texto: string) {
    const t = texto.trim();
    if (!t || ocupado || t.length > maxChars) return;
    // Opciones por petición: partidos acotados y modo de lectura activo en ese momento
    sendMessage(
      { text: t },
      {
        body: {
          candidaturas: seleccion,
          lecturaFacil: document.documentElement.dataset.lectura === "facil",
        },
      },
    );
    setInput("");
  }

  return (
    <div className="flex flex-col gap-6">
      <fieldset>
        <legend className="text-sm font-semibold">Pregunta sobre (opcional)</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {candidaturas.map((c) => {
            const on = seleccion.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={on}
                onClick={() =>
                  setSeleccion((s) => (on ? s.filter((x) => x !== c.id) : [...s, c.id]))
                }
                className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3 text-sm ${
                  on
                    ? "border-ink bg-ink text-paper"
                    : "border-rule bg-paper-raised hover:border-rule-strong"
                }`}
              >
                <span
                  aria-hidden
                  className="h-2 w-2 rounded-full"
                  style={{ background: c.color }}
                />
                {c.corto}
                {on && <Check aria-hidden className="h-3.5 w-3.5" />}
              </button>
            );
          })}
        </div>
        <p className="text-ink-faint mt-1 text-xs">
          {seleccion.length
            ? "Solo se buscará en los partidos marcados."
            : "Sin marcar: todos los partidos."}
        </p>
      </fieldset>

      <ol className="flex flex-col gap-5" aria-live="polite">
        {messages.map((m) => (
          <li key={m.id} className={m.role === "user" ? "self-end" : "self-stretch"}>
            {m.role === "user" ? (
              <p className="bg-ink text-paper max-w-[46ch] rounded-2xl rounded-br-sm px-4 py-2.5">
                {m.parts.map((p) => (p.type === "text" ? p.text : "")).join("")}
              </p>
            ) : (
              <Respuesta mensaje={m} escribiendo={ocupado && m.id === messages.at(-1)?.id} />
            )}
          </li>
        ))}
        {status === "submitted" && (
          <li className="text-ink-muted flex items-center gap-2 text-sm">
            <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> Preparando la respuesta…
          </li>
        )}
      </ol>

      {error && (
        <p role="alert" className="border-rule rounded-md border p-3 text-sm">
          No se ha podido responder ahora mismo. Inténtalo de nuevo en unos segundos.
        </p>
      )}

      {messages.length === 0 && (
        <div>
          <p className="text-sm font-semibold">Prueba con:</p>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {SUGERENCIAS.map((s) => (
              <li key={s}>
                <button
                  type="button"
                  onClick={() => enviar(s)}
                  className="border-rule bg-paper-raised hover:border-rule-strong w-full rounded-lg border px-4 py-3 text-left text-sm"
                >
                  {s}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <form
        className="border-rule-strong bg-paper-raised sticky bottom-3 rounded-2xl border p-2 shadow-lg"
        onSubmit={(e) => {
          e.preventDefault();
          enviar(input);
        }}
      >
        <label htmlFor="pregunta" className="sr-only">
          Tu pregunta sobre los programas
        </label>
        <div className="flex items-end gap-2">
          <textarea
            id="pregunta"
            rows={2}
            value={input}
            maxLength={maxChars}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                enviar(input);
              }
            }}
            placeholder="Pregunta lo que quieras sobre los programas…"
            className="placeholder:text-ink-faint min-h-12 flex-1 resize-none bg-transparent px-2 py-2 outline-none"
          />
          {ocupado ? (
            <button
              type="button"
              onClick={() => stop()}
              aria-label="Detener"
              className="bg-ink text-paper grid h-11 w-11 place-items-center rounded-full"
            >
              <Square aria-hidden className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="submit"
              aria-label="Enviar pregunta"
              disabled={!input.trim()}
              className="bg-ink text-paper grid h-11 w-11 place-items-center rounded-full disabled:opacity-30"
            >
              <ArrowUp aria-hidden className="h-5 w-5" />
            </button>
          )}
        </div>
        <p className="tabular text-ink-faint px-2 pt-1 text-right text-xs">
          {input.length}/{maxChars}
        </p>
      </form>
    </div>
  );
}

function Respuesta({ mensaje, escribiendo }: { mensaje: MensajeChat; escribiendo: boolean }) {
  const registro = new Map<string, FuenteChat>();
  for (const p of mensaje.parts) if (p.type === "data-fuente") registro.set(p.data.ref, p.data);
  const herramientaActiva = mensaje.parts.findLast(
    (p) => p.type.startsWith("tool-") && "state" in p && p.state !== "output-available",
  );
  const texto = mensaje.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
  const visible = escribiendo ? sinMarcaIncompleta(texto) : texto;

  return (
    <div className="border-rule bg-paper-raised rounded-2xl border px-4 py-3">
      {herramientaActiva && escribiendo && (
        <p className="text-ink-muted mb-2 flex items-center gap-2 text-sm">
          <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
          {ESTADO_HERRAMIENTA[herramientaActiva.type] ?? "Consultando los programas…"}
        </p>
      )}
      <Texto texto={visible} registro={registro} />
    </div>
  );
}

/** Mini-renderizador seguro (sin HTML): párrafos, listas «- » y **negrita**, con citas. */
function Texto({ texto, registro }: { texto: string; registro: Map<string, FuenteChat> }) {
  const bloques = texto.split(/\n{2,}/).filter((b) => b.trim());
  return (
    <div className="space-y-3 leading-relaxed">
      {bloques.map((b, i) => {
        const lineas = b.split("\n").filter((l) => l.trim());
        if (lineas.every((l) => /^\s*[-•*]\s+/.test(l))) {
          return (
            <ul key={i} className="space-y-1.5">
              {lineas.map((l, j) => (
                <li key={j} className="relative pl-4">
                  <span
                    aria-hidden
                    className="bg-ink-faint absolute top-[0.7em] left-0 h-1 w-1 rounded-full"
                  />
                  <Linea texto={l.replace(/^\s*[-•*]\s+/, "")} registro={registro} />
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i}>
            {lineas.map((l, j) => (
              <span key={j}>
                {j > 0 && <br />}
                <Linea texto={l} registro={registro} />
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

function Linea({ texto, registro }: { texto: string; registro: Map<string, FuenteChat> }) {
  const { segmentos } = segmentar(texto, registro);
  return (
    <>
      {segmentos.map((s, i) =>
        s.tipo === "texto" ? (
          <Negritas key={i} texto={s.valor} />
        ) : (
          <span key={i}>
            {dedupPorPagina(s.fuentes).map((f) => (
              <CitaMark
                key={f.ref}
                conv={f.conv}
                cand={f.cand}
                cid={f.id}
                pagina={`${f.candCorto} ${f.pagina}`}
                candCorto={f.candCorto}
                convCorto={f.convCorto}
              />
            ))}
          </span>
        ),
      )}
    </>
  );
}

function dedupPorPagina(fuentes: FuenteChat[]): FuenteChat[] {
  const vistas = new Set<string>();
  return fuentes.filter((f) => {
    const k = `${f.cand}|${f.conv}|${f.pagina}`;
    if (vistas.has(k)) return false;
    vistas.add(k);
    return true;
  });
}

function Negritas({ texto }: { texto: string }) {
  const partes = texto.split(/\*\*(.+?)\*\*/g);
  return (
    <>{partes.map((p, i) => (i % 2 ? <strong key={i}>{p}</strong> : <span key={i}>{p}</span>))}</>
  );
}
