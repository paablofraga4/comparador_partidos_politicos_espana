"use client";

import { ArrowRight, Loader2 } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useId, useState } from "react";

import {
  centimosPorPregunta,
  euros,
  fechaCaducidad,
  PLANES,
  type IdPlan,
} from "@/lib/bonos/planes";
import type { LimiteChat } from "@/lib/chat/tipos";
import { SegunLectura } from "./segun-lectura";

const POR_QUE = {
  normal:
    "Cada respuesta del asistente usa inteligencia artificial, y eso cuesta dinero. Con un bono cubres ese coste y ayudas a mantener VotoClaro al día. El comparador, las fuentes y la lectura fácil siguen siendo gratis para todo el mundo.",
  facil:
    "El asistente usa inteligencia artificial. La inteligencia artificial cuesta dinero. Con un bono puedes hacer más preguntas. El comparador sigue siendo gratis.",
};

const PRONTO = {
  normal:
    "Pronto podrás ampliar con un bono. Mientras tanto, el comparador, las fuentes y la lectura fácil siguen siendo gratis y sin límite.",
  facil: "Pronto podrás comprar más preguntas. El comparador sigue siendo gratis.",
};

function textos(l: LimiteChat): {
  titulo: string;
  detalle?: { normal: string; facil: string };
  venta: boolean;
} {
  switch (l.motivo) {
    case "gratis-ip":
      return {
        titulo: "Desde esta conexión ya se han usado hoy las preguntas gratis",
        detalle: {
          normal:
            "Para que el asistente siga siendo gratis para todo el mundo, hay un máximo diario de preguntas gratis por conexión.",
          facil: "Hoy ya se han hecho muchas preguntas gratis desde esta conexión.",
        },
        venta: true,
      };
    case "gratis-presupuesto":
      return {
        titulo: "Por hoy se han agotado las preguntas gratis",
        detalle: {
          normal:
            "Cada día reservamos una cantidad para las preguntas gratis y hoy ya se ha gastado. Mañana vuelve a haber.",
          facil: "Hoy ya no quedan preguntas gratis. Mañana habrá más.",
        },
        venta: true,
      };
    case "bono-hora":
      return {
        titulo: "Has llegado al máximo de preguntas por hora de tu bono",
        detalle: {
          normal: "Tu bono sigue teniendo preguntas. Vuelve a intentarlo dentro de un rato.",
          facil: "Tu bono tiene más preguntas. Espera un poco y vuelve a preguntar.",
        },
        venta: false,
      };
    case "pago-presupuesto":
      return {
        titulo: "El asistente está en pausa un momento",
        detalle: {
          normal:
            "Hemos llegado a un límite de seguridad. Tu bono no ha perdido ninguna pregunta. Vuelve a intentarlo más tarde.",
          facil: "El asistente está parado un rato. No has perdido preguntas.",
        },
        venta: false,
      };
    default:
      return {
        titulo: l.bonoTerminado
          ? "Tu bono se ha terminado"
          : `Has usado tus ${l.gratisTotal} preguntas gratis`,
        venta: true,
      };
  }
}

/** Tarjeta al llegar al límite del chat (spec 004, HU-4.3): por qué, planes y código. */
export function TarjetaPlanes({
  limite,
  pagosActivos,
  alCanjear,
}: {
  limite: LimiteChat;
  pagosActivos: boolean;
  alCanjear: () => void;
}) {
  const t = textos(limite);
  const quieto = useReducedMotion();
  const tituloId = useId();
  return (
    <motion.section
      aria-labelledby={tituloId}
      initial={quieto ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="border-rule-strong bg-paper-raised rounded-2xl border p-5 shadow-sm sm:p-6"
    >
      <h2 id={tituloId} className="font-serif text-2xl leading-tight">
        {t.titulo}
      </h2>
      <div className="text-ink-muted mt-3 space-y-2 leading-relaxed">
        {t.detalle && (
          <SegunLectura normal={<p>{t.detalle.normal}</p>} facil={<p>{t.detalle.facil}</p>} />
        )}
        {t.venta && (
          <SegunLectura
            normal={<p>{pagosActivos ? POR_QUE.normal : PRONTO.normal}</p>}
            facil={<p>{pagosActivos ? POR_QUE.facil : PRONTO.facil}</p>}
          />
        )}
      </div>

      {t.venta && pagosActivos && <Planes />}

      <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
        {t.venta && <CanjearCodigo alCanjear={alCanjear} />}
        <Link
          href="/comparar"
          className="inline-flex min-h-11 items-center gap-1.5 font-medium underline-offset-4 hover:underline"
        >
          Seguir comparando gratis <ArrowRight aria-hidden className="h-4 w-4" />
        </Link>
      </div>
    </motion.section>
  );
}

/** Los 3 bonos con su botón de compra. También en /apoya (spec 005, HU-5.2). */
export function Planes() {
  const [cargando, setCargando] = useState<IdPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function comprar(plan: IdPlan) {
    setCargando(plan);
    setError(null);
    try {
      const r = await fetch("/api/bonos/comprar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const d = (await r.json()) as { url?: string; error?: string };
      if (!r.ok || !d.url) throw new Error(d.error ?? "No se ha podido abrir el pago.");
      window.location.assign(d.url);
    } catch (e) {
      setError((e as Error).message);
      setCargando(null);
    }
  }

  return (
    <div className="mt-5">
      <ul className="grid gap-3 sm:grid-cols-3">
        {PLANES.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => comprar(p.id)}
              disabled={cargando !== null}
              aria-label={`${p.preguntas} preguntas por ${euros(p.precioCent)}`}
              className="border-rule bg-paper hover:border-ink focus-visible:border-ink flex h-full min-h-11 w-full flex-col items-start gap-1 rounded-xl border p-4 text-left transition-colors disabled:opacity-60"
            >
              <span className="font-serif text-xl leading-tight">{p.preguntas} preguntas</span>
              <span className="tabular text-lg font-semibold">
                {cargando === p.id ? (
                  <Loader2 aria-hidden className="h-5 w-5 animate-spin" />
                ) : (
                  euros(p.precioCent)
                )}
              </span>
              <span className="text-ink-muted text-sm">
                ≈ {centimosPorPregunta(p)} céntimos por pregunta
              </span>
            </button>
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="mt-3 text-sm">
          {error}
        </p>
      )}
      <p className="text-ink-faint mt-3 text-xs leading-relaxed">
        Pago único con tarjeta, Apple Pay o Google Pay, procesado por Stripe. Sin suscripción y sin
        cuenta: no guardamos tu nombre ni tu email. Válido hasta el {fechaCaducidad()}. Precios con
        IVA. Al pagar aceptas las{" "}
        <Link href="/condiciones" className="underline">
          condiciones
        </Link>
        .
      </p>
    </div>
  );
}

/** «Tengo un código» (spec 004, HU-4.6). */
export function CanjearCodigo({
  alCanjear,
  abierto: abiertoInicial = false,
}: {
  alCanjear: (quedan: number) => void;
  abierto?: boolean;
}) {
  const [abierto, setAbierto] = useState(abiertoInicial);
  const [codigo, setCodigo] = useState("");
  const [estado, setEstado] = useState<{ cargando?: boolean; error?: string; ok?: string }>({});
  const id = useId();

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="min-h-11 font-medium underline-offset-4 hover:underline"
      >
        Tengo un código
      </button>
    );
  }

  return (
    <form
      className="flex w-full flex-wrap items-end gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setEstado({ cargando: true });
        const r = await fetch("/api/bonos/canjear", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ codigo }),
        });
        const d = (await r.json().catch(() => ({}))) as { quedan?: number; error?: string };
        if (!r.ok || d.quedan === undefined) {
          setEstado({ error: d.error ?? "No se ha podido usar el código." });
          return;
        }
        setEstado({ ok: `Listo: te quedan ${d.quedan} preguntas.` });
        alCanjear(d.quedan);
      }}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <label htmlFor={id} className="text-sm font-semibold">
          Tu código de bono
        </label>
        <input
          id={id}
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          placeholder="VC-XXXX-XXXX-XXXX"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          className="border-rule-strong bg-paper tabular min-h-11 rounded-md border px-3 uppercase"
        />
      </div>
      <button
        type="submit"
        disabled={!codigo.trim() || estado.cargando}
        className="bg-ink text-paper min-h-11 rounded-md px-4 font-semibold disabled:opacity-40"
      >
        {estado.cargando ? "Comprobando…" : "Usar código"}
      </button>
      <p role="status" className="w-full text-sm">
        {estado.error ?? estado.ok ?? ""}
      </p>
    </form>
  );
}
