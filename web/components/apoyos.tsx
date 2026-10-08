/**
 * Piezas de los apoyos (spec 005): la sección de la portada, los formularios y el tablón.
 * Todo se pinta en el servidor: los formularios son HTML y no añaden JavaScript.
 */
import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { IMPORTES, MINIMO_CENT, type TipoApoyo } from "@/lib/apoyos/config";
import { centMensual, fijosMensualCent, type CosteFijo } from "@/lib/apoyos/cuentas";
import type { Tablon } from "@/lib/apoyos/tablon";
import { euros } from "@/lib/bonos/planes";

import { SegunLectura } from "./segun-lectura";

const BOTON =
  "border-rule-strong bg-paper-raised hover:border-ink focus-visible:border-ink inline-flex min-h-11 items-center justify-center rounded-xl border px-4 py-2 text-center font-medium transition-colors";

/** «8 € al mes · 14 € al año»: cada partida fija tal como se factura. */
function partidaFija(c: CosteFijo): string {
  if (typeof c.euros_mes === "number") return `${euros(c.euros_mes * 100)} al mes`;
  if (typeof c.euros_ano === "number") return `${euros(c.euros_ano * 100)} al año`;
  return "pendiente de actualizar";
}

/**
 * Final de la portada (HU-5.2). La portada es estática: `activos` se decide en el build
 * (APOYOS_ACTIVOS se pasa como ARG en el Dockerfile).
 */
export function SeccionMantenimiento({ fijos, activos }: { fijos: CosteFijo[]; activos: boolean }) {
  const alMes = Math.round(fijosMensualCent(fijos) / 100);
  return (
    <section className="border-rule bg-paper-raised border-t" aria-labelledby="mantener-h">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <h2 id="mantener-h" className="text-3xl font-medium">
          Cómo se mantiene VotoClaro
        </h2>
        <div className="text-ink-muted mt-4 max-w-2xl text-lg leading-relaxed">
          <SegunLectura
            normal={
              <p>
                VotoClaro no tiene anuncios ni ningún partido detrás. Mantenerlo cuesta unos{" "}
                {alMes}&nbsp;€ al mes en servidor y dominio, más la IA: la de cada consulta del chat
                y la de analizar cada programa. Si te resulta útil, puedes ayudar a cubrirlo.
              </p>
            }
            facil={
              <p>
                VotoClaro no tiene anuncios. No depende de ningún partido. Mantener la web cuesta
                unos{" "}
                {alMes}&nbsp;euros al mes, más la inteligencia artificial que lee los programas y
                responde en el chat. Si te sirve, puedes ayudar.
              </p>
            }
          />
        </div>
        <p className="text-ink-faint mt-3 text-sm">
          {fijos.map((c) => `${c.nombre}: ${partidaFija(c)}`).join(" · ")} · IA: según el uso y
          cada programa nuevo
        </p>
        <div className="mt-6 grid gap-3 sm:max-w-3xl sm:grid-cols-3">
          {activos && (
            <>
              <Link href="/apoya?tipo=mensual#apoyar" className={BOTON}>
                Apoyar cada mes
              </Link>
              <Link href="/apoya?tipo=puntual#apoyar" className={BOTON}>
                Apoyar una vez
              </Link>
            </>
          )}
          <Link href="/apoya#bonos" className={BOTON}>
            Comprar preguntas del chat
          </Link>
        </div>
        <Link
          href="/apoya"
          className="mt-6 inline-flex min-h-11 items-center gap-1.5 font-medium underline-offset-4 hover:underline"
        >
          {activos ? "Ver quién lo apoya y en qué se gasta" : "Ver en qué se gasta"}
          <ArrowRight aria-hidden className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

/** Lo que cuesta cada partida fija al mes (las anuales, prorrateadas). */
export function costeMensualTexto(c: CosteFijo): string {
  const cent = centMensual(c);
  if (cent === null) return "pendiente de actualizar";
  return typeof c.euros_ano === "number"
    ? `${euros(cent)} al mes (${euros(c.euros_ano * 100)} al año)`
    : `${euros(cent)} al mes`;
}

/** Formulario de un tipo de apoyo (HU-5.4). Ningún importe va preseleccionado. */
export function FormularioApoyo({ tipo, abierto }: { tipo: TipoApoyo; abierto: boolean }) {
  const mensual = tipo === "mensual";
  const titulo = mensual ? "Cada mes" : "Una vez";
  const id = `apoyo-${tipo}`;
  return (
    <form
      action="/api/apoyos/iniciar"
      method="post"
      className={`bg-paper-raised rounded-2xl border p-5 sm:p-6 ${abierto ? "border-ink" : "border-rule-strong"}`}
    >
      <input type="hidden" name="tipo" value={tipo} />
      <fieldset>
        <legend className="font-serif text-2xl leading-tight">{titulo}</legend>
        <p className="text-ink-muted mt-1 text-sm">
          {mensual
            ? "Se cobra cada mes. Lo cancelas cuando quieras."
            : "Un solo pago, sin compromiso."}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {IMPORTES[tipo].map((c) => (
            <label key={c} className="has-[:checked]:border-ink has-[:checked]:bg-paper border-rule-strong inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-4 font-medium">
              <input type="radio" name="importe" value={c} required className="accent-[var(--ink)]" />
              <span className="tabular">
                {euros(c)}
                {mensual && <span className="text-ink-muted font-normal"> /mes</span>}
              </span>
            </label>
          ))}
          {!mensual && (
            <label className="has-[:checked]:border-ink has-[:checked]:bg-paper border-rule-strong inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-4 font-medium">
              <input type="radio" name="importe" value="otro" required className="accent-[var(--ink)]" />
              Otra cantidad
            </label>
          )}
        </div>
        {!mensual && (
          <label htmlFor={`${id}-otro`} className="mt-3 block text-sm">
            Si eliges otra cantidad, escríbela en euros (desde {euros(MINIMO_CENT)}):
            <input
              id={`${id}-otro`}
              name="otro"
              inputMode="decimal"
              autoComplete="off"
              placeholder="7,50"
              className="border-rule-strong bg-paper mt-1 block min-h-11 w-32 rounded-xl border px-3"
            />
          </label>
        )}
      </fieldset>
      <button
        type="submit"
        className="bg-ink text-paper mt-5 inline-flex min-h-11 items-center gap-1.5 rounded-xl px-5 font-medium"
      >
        {mensual ? "Apoyar cada mes" : "Apoyar una vez"} <ArrowRight aria-hidden className="h-4 w-4" />
      </button>
    </form>
  );
}

const FECHA = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Europe/Madrid",
});

/** Tablón (HU-5.5): solo nombres; nunca importes por persona. */
export function TablonApoyos({ t, soloEsteMes }: { t: Tablon; soloEsteMes: boolean }) {
  const vacio = t.top.length === 0 && t.ultimos.length === 0;
  return (
    <>
      {vacio ? (
        <p className="text-ink-muted mt-4">
          Todavía no hay nombres en el tablón{t.anonimos > 0 ? "" : ": el tuyo puede ser el primero"}.
        </p>
      ) : (
        <div className="mt-6 grid gap-8 md:grid-cols-2">
          <div>
            <h3 className="text-xl">Quienes más han apoyado</h3>
            <ol className="mt-3 space-y-2">
              {t.top.map((n, i) => (
                <li key={n} className="flex gap-3">
                  <span className="text-ink-faint tabular w-6 text-right">{i + 1}.</span>
                  <span>{n}</span>
                </li>
              ))}
            </ol>
          </div>
          <div>
            <h3 className="text-xl">Últimos apoyos</h3>
            <ul className="mt-3 space-y-2">
              {t.ultimos.map((u) => (
                <li key={`${u.nombre}-${u.fecha.getTime()}`} className="flex flex-wrap gap-x-2">
                  <span>{u.nombre}</span>
                  <span className="text-ink-faint text-sm leading-6">
                    {u.tipo === "mensual" ? "cada mes" : "una vez"} · {FECHA.format(u.fecha)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {t.anonimos > 0 && (
        <p className="text-ink-muted mt-6">
          {vacio ? "Hay" : "Y"} {t.anonimos} {t.anonimos === 1 ? "persona" : "personas"}{" "}
          {vacio ? "" : "más "}que {t.anonimos === 1 ? "prefiere" : "prefieren"} no salir.
        </p>
      )}
      <p className="text-ink-faint mt-3 text-sm">
        {soloEsteMes ? "Cuenta los apoyos de este mes." : "Cuenta todos los apoyos desde el principio."}{" "}
        Sin importes por persona: las listas solo sirven para dar las gracias.
      </p>
    </>
  );
}
