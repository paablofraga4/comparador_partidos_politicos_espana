"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ArrowUp, Check, Loader2, Square } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { fechaCaducidad } from "@/lib/bonos/planes";
import { segmentar, sinMarcaIncompleta, type FuenteChat } from "@/lib/chat/refs";
import type { CupoChat, LimiteChat, MensajeChat } from "@/lib/chat/tipos";
import { CitaMark } from "./cita";
import { TarjetaPlanes } from "./planes";

type EstadoCupo = {
  gratis: CupoChat;
  bono: CupoChat | null;
  bonoTerminado: boolean;
  gratisPausado: boolean;
};

const AVISOS_PAGO: Record<string, string> = {
  cancelado: "Has cancelado el pago. No se te ha cobrado nada.",
  pendiente: "El pago aún no se ha confirmado. Si se completa, tu bono se activará solo.",
  error: "No hemos podido activar el bono. Si se te ha cobrado, usa el código de tu recibo.",
};

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

export function Chat({
  candidaturas,
  maxChars,
  pagosActivos,
  avisoPago,
}: {
  candidaturas: Opcion[];
  maxChars: number;
  pagosActivos: boolean;
  avisoPago?: string;
}) {
  const [seleccion, setSeleccion] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [estadoCupo, setEstadoCupo] = useState<EstadoCupo | null>(null);
  // Tras canjear un código, el límite que se mostraba deja de valer
  const [limiteResuelto, setLimiteResuelto] = useState<string | null>(null);

  const cargarCupo = useCallback(() => {
    fetch("/api/cupo", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: EstadoCupo | null) => d && setEstadoCupo(d))
      .catch(() => {});
  }, []);
  useEffect(() => cargarCupo(), [cargarCupo]);

  const transport = useMemo(() => new DefaultChatTransport<MensajeChat>({ api: "/api/chat" }), []);
  // Tras cada respuesta (o fallo, que devuelve la pregunta) se vuelve a leer el cupo
  const { messages, sendMessage, status, stop, error } = useChat<MensajeChat>({
    transport,
    onFinish: cargarCupo,
    onError: cargarCupo,
  });
  const ocupado = status === "submitted" || status === "streaming";

  const cupo: CupoChat | null = estadoCupo ? (estadoCupo.bono ?? estadoCupo.gratis) : null;
  const ultima = messages.findLast((m) => m.role === "assistant");
  const limiteRespuesta = ultima?.parts.find((p) => p.type === "data-limite")?.data;
  let limite: LimiteChat | null = null;
  if (limiteRespuesta && ultima?.id !== limiteResuelto) {
    limite = limiteRespuesta;
  } else if (estadoCupo && !estadoCupo.bono && !ocupado) {
    // Si ya no quedan gratis, se avisa antes de preguntar (sin gastar un viaje al servidor)
    const total = estadoCupo.gratis.total;
    if (estadoCupo.gratis.quedan === 0) {
      limite = {
        motivo: "gratis-agotado",
        gratisTotal: total,
        bonoTerminado: estadoCupo.bonoTerminado,
      };
    } else if (estadoCupo.gratisPausado) {
      limite = { motivo: "gratis-presupuesto", gratisTotal: total, bonoTerminado: false };
    }
  }

  function trasCanjear() {
    if (ultima) setLimiteResuelto(ultima.id);
    cargarCupo();
  }

  function enviar(texto: string) {
    const t = texto.trim();
    if (!t || ocupado || t.length > maxChars || limite) return;
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
      {avisoPago && AVISOS_PAGO[avisoPago] && (
        <p role="status" className="border-rule bg-paper-raised rounded-lg border p-3 text-sm">
          {AVISOS_PAGO[avisoPago]}
        </p>
      )}
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
        {messages.filter(conContenido).map((m) => (
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

      {messages.length === 0 && !limite && (
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

      {limite ? (
        <TarjetaPlanes limite={limite} pagosActivos={pagosActivos} alCanjear={trasCanjear} />
      ) : (
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
          <div className="text-ink-faint flex items-center justify-between gap-3 px-2 pt-1 text-xs">
            <p aria-live="polite">{cupo && <TextoCupo cupo={cupo} />}</p>
            <p className="tabular">
              {input.length}/{maxChars}
            </p>
          </div>
        </form>
      )}
    </div>
  );
}

/** Los mensajes que solo traen el límite se pintan como tarjeta, no como burbuja vacía. */
function conContenido(m: MensajeChat): boolean {
  return (
    m.role === "user" || m.parts.some((p) => p.type !== "data-limite" && p.type !== "data-cupo")
  );
}

function TextoCupo({ cupo }: { cupo: CupoChat }) {
  if (cupo.tipo === "bono") {
    return (
      <>
        Tu bono: <span className="tabular">{cupo.quedan}</span>{" "}
        {cupo.quedan === 1 ? "pregunta" : "preguntas"} · hasta el{" "}
        {fechaCaducidad(new Date(cupo.caduca))} ·{" "}
        <Link href="/bono" className="underline">
          ver código
        </Link>
      </>
    );
  }
  return (
    <>
      Te {cupo.quedan === 1 ? "queda" : "quedan"} <span className="tabular">{cupo.quedan}</span>{" "}
      {cupo.quedan === 1 ? "pregunta gratis" : "preguntas gratis"}
    </>
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
