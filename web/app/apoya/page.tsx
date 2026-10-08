import type { Metadata } from "next";
import Link from "next/link";

import { costeMensualTexto, FormularioApoyo, TablonApoyos } from "@/components/apoyos";
import { Planes } from "@/components/planes";
import { SegunLectura } from "@/components/segun-lectura";
import { estadoApoyos, ocultos, periodo, urlPortal } from "@/lib/apoyos/config";
import { COMISION, comisionEstimadaCent, iaUltimos30Usd, ingresosBonos } from "@/lib/apoyos/cuentas";
import { desdePeriodo, tablon, type Tablon } from "@/lib/apoyos/tablon";
import { estadoPagos, titular } from "@/lib/bonos/pagos";
import { euros } from "@/lib/bonos/planes";
import { cargaIa, costesFijos } from "@/lib/data";
import { getDb, hayDb } from "@/lib/db";
import { metaPagina } from "@/lib/seo";

export const metadata: Metadata = metaPagina({
  titulo: "Apoya VotoClaro: lo que cuesta y quién lo apoya",
  descripcion:
    "Cuentas claras de VotoClaro: lo que cuesta al mes (servidor, IA y dominio), lo que entra y cómo apoyarlo cada mes o una vez, sin cuenta.",
  ruta: "/apoya",
});

// Cifras vivas (base de datos) e interruptores en tiempo de ejecución (spec 005, HU-5.3 a 5.8)
export const dynamic = "force-dynamic";

const USD = new Intl.NumberFormat("es-ES", { style: "currency", currency: "USD" });
const FECHA = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", year: "numeric" });
const fecha = (iso: string) => FECHA.format(new Date(`${iso}T12:00:00Z`));

const AVISOS: Record<string, string> = {
  importe: "Elige un importe. Si escribes otra cantidad, que sea de 2 € a 500 €.",
  inactivo: "Ahora mismo no se puede apoyar. Inténtalo más tarde.",
  pago: "No se ha podido abrir el pago. Inténtalo de nuevo en unos minutos.",
  cancelado: "Has cancelado el pago: no se ha cobrado nada.",
  pendiente: "El pago aún no está confirmado. Si se completa, tu apoyo aparecerá en unos minutos.",
  error: "No hemos podido confirmar el pago. Si se te ha cobrado, escríbenos y lo revisamos.",
};

const VACIO: Tablon = { top: [], ultimos: [], anonimos: 0, personas: 0, mensualesActivos: 0, totalCent: 0, cobros: 0 };

export default async function Apoya({ searchParams }: PageProps<"/apoya">) {
  const q = await searchParams;
  const uno = (k: string) => (typeof q[k] === "string" ? (q[k] as string) : null);
  const aviso = AVISOS[uno("error") ?? uno("pago") ?? ""] ?? null;
  const tipoElegido = uno("tipo");

  const fijos = costesFijos();
  const carga = cargaIa();
  const p = periodo();
  const desde = desdePeriodo(p);
  const apoyosActivos = estadoApoyos().activos;
  const bonosActivos = estadoPagos().activos;
  const portal = urlPortal();
  const t0 = titular();

  let t = VACIO;
  let iaUsd: number | null = null;
  let bonos = { cent: 0, cobros: 0 };
  if (hayDb()) {
    try {
      const db = await getDb();
      [t, iaUsd, bonos] = await Promise.all([
        tablon(db, { desde, ocultos: ocultos() }),
        iaUltimos30Usd(db),
        ingresosBonos(db, desde),
      ]);
    } catch (e) {
      console.error("⚠ /apoya sin datos:", (e as Error).message);
    }
  }
  const comisiones = comisionEstimadaCent(t.totalCent + bonos.cent, t.cobros + bonos.cobros);
  const cuando = p === "mes" ? "este mes" : "desde el principio";

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="text-4xl font-medium sm:text-5xl">Apoya VotoClaro</h1>
      <div className="text-ink-muted mt-4 max-w-2xl text-lg leading-relaxed">
        <SegunLectura
          normal={
            <p>
              VotoClaro es un proyecto independiente: sin anuncios, sin cuentas y sin ningún partido
              detrás. Aquí tienes lo que cuesta, lo que entra y cómo ayudar, con las cifras reales.
            </p>
          }
          facil={
            <p>
              VotoClaro no tiene anuncios. Ningún partido lo paga. Aquí ves cuánto cuesta, cuánto
              dinero entra y cómo puedes ayudar.
            </p>
          }
        />
      </div>

      {aviso && (
        <p role="status" className="border-rule-strong bg-paper-raised mt-6 rounded-xl border p-4">
          {aviso}
        </p>
      )}

      <section className="mt-12" aria-labelledby="cuesta-h">
        <h2 id="cuesta-h" className="text-3xl font-medium">
          Lo que cuesta
        </h2>
        <dl className="border-rule mt-4 divide-y border-y">
          {fijos.map((c) => (
            <div key={c.id} className="flex flex-wrap justify-between gap-x-6 gap-y-1 py-3">
              <dt>
                {c.nombre}
                <span className="text-ink-faint block text-sm">Actualizado el {fecha(c.actualizado)}</span>
              </dt>
              <dd className="tabular font-medium">{costeMensualTexto(c)}</dd>
            </div>
          ))}
          <div className="flex flex-wrap justify-between gap-x-6 gap-y-1 py-3">
            <dt>
              IA · consultas del chat
              <span className="text-ink-faint block text-sm">
                Gasto real de los últimos 30 días. OpenAI cobra en dólares.
              </span>
            </dt>
            <dd className="tabular font-medium">
              {iaUsd === null ? "pendiente de actualizar" : USD.format(iaUsd)}
            </dd>
          </div>
          <div className="flex flex-wrap justify-between gap-x-6 gap-y-1 py-3">
            <dt>
              IA · carga de los programas
              <span className="text-ink-faint block text-sm">
                Analizar y adaptar a lectura fácil los {carga.programas} programas. Se paga una vez
                por programa y se repetirá con los del 29N. Es el mínimo registrado: no incluye los
                reintentos.
              </span>
            </dt>
            <dd className="tabular font-medium">{USD.format(carga.usd)} en total</dd>
          </div>
          <div className="flex flex-wrap justify-between gap-x-6 gap-y-1 py-3">
            <dt>
              Comisiones de pago (Stripe)
              <span className="text-ink-faint block text-sm">
                Estimación de lo cobrado {cuando}:{" "}
                {(COMISION.porcentaje * 100).toLocaleString("es-ES", { maximumFractionDigits: 2 })}&nbsp;% +{" "}
                {euros(COMISION.fijoCent)} por pago.
              </span>
            </dt>
            <dd className="tabular font-medium">{euros(comisiones)}</dd>
          </div>
        </dl>
        <p className="text-ink-muted mt-3 text-sm">
          El desarrollo y la revisión los hace el autor sin cobrar. Las cifras fijas salen de las
          facturas y están en el repositorio (
          <a
            className="underline"
            href={`https://github.com/${process.env.NEXT_PUBLIC_GITHUB_REPO ?? "paablofraga4/comparador_partidos_politicos_espana"}/blob/main/data/costes.yaml`}
          >
            data/costes.yaml
          </a>
          ).
        </p>
      </section>

      <section className="mt-12" aria-labelledby="entra-h">
        <h2 id="entra-h" className="text-3xl font-medium">
          Lo que entra
        </h2>
        <dl className="border-rule mt-4 divide-y border-y">
          <div className="flex flex-wrap justify-between gap-x-6 gap-y-1 py-3">
            <dt>
              Apoyos
              <span className="text-ink-faint block text-sm">
                {t.mensualesActivos === 1
                  ? "1 persona apoya cada mes"
                  : `${t.mensualesActivos} personas apoyan cada mes`}
              </span>
            </dt>
            <dd className="tabular font-medium">{euros(t.totalCent)}</dd>
          </div>
          <div className="flex flex-wrap justify-between gap-x-6 gap-y-1 py-3">
            <dt>Bonos del chat</dt>
            <dd className="tabular font-medium">{euros(bonos.cent)}</dd>
          </div>
        </dl>
        <p className="text-ink-faint mt-3 text-sm">Importes cobrados {cuando}, sin restar comisiones.</p>
      </section>

      <section className="mt-12 scroll-mt-32" id="apoyar" aria-labelledby="apoyar-h">
        <h2 id="apoyar-h" className="text-3xl font-medium">
          Apoyar
        </h2>
        {apoyosActivos ? (
          <>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <FormularioApoyo tipo="mensual" abierto={tipoElegido === "mensual"} />
              <FormularioApoyo tipo="puntual" abierto={tipoElegido === "puntual"} />
            </div>
            <p className="text-ink-faint mt-4 text-sm leading-relaxed">
              Pago con tarjeta, Apple Pay o Google Pay, procesado por Stripe. Es una aportación
              voluntaria: no es una compra y no desgrava, porque VotoClaro no es una asociación ni una
              fundación. En el pago puedes escribir un nombre o alias para el tablón; si lo dejas
              vacío, cuentas como anónimo. No guardamos tu email.{" "}
              <Link href="/condiciones#apoyos" className="underline">
                Condiciones
              </Link>
              .
            </p>
            {portal && (
              <p className="mt-3">
                <a href={portal} className="inline-flex min-h-11 items-center font-medium underline underline-offset-4">
                  ¿Ya apoyas cada mes? Gestionar o cancelar mi apoyo
                </a>
              </p>
            )}
          </>
        ) : (
          <p className="text-ink-muted mt-4">
            Muy pronto podrás apoyar cada mes o una vez. Mientras tanto, puedes ayudar comprando
            preguntas del chat.
          </p>
        )}
      </section>

      <section className="mt-12 scroll-mt-32" id="bonos" aria-labelledby="bonos-h">
        <h2 id="bonos-h" className="text-3xl font-medium">
          Comprar preguntas del chat
        </h2>
        <p className="text-ink-muted mt-3 max-w-2xl">
          El comparador es gratis y sin límite. El chat da 2 preguntas gratis; con un bono tienes más
          y ayudas a cubrir lo que cuesta la IA.
        </p>
        {bonosActivos ? (
          <Planes />
        ) : (
          <p className="text-ink-muted mt-3">Pronto podrás comprar bonos de preguntas.</p>
        )}
      </section>

      <section className="mt-12 scroll-mt-32" id="tablon" aria-labelledby="tablon-h">
        <h2 id="tablon-h" className="text-3xl font-medium">
          Gracias a
        </h2>
        <TablonApoyos t={t} soloEsteMes={p === "mes"} />
      </section>

      <section className="mt-12" aria-labelledby="reglas-h">
        <h2 id="reglas-h" className="text-3xl font-medium">
          Reglas para que siga siendo neutral
        </h2>
        <ul className="text-ink-muted mt-4 list-disc space-y-2 pl-5 leading-relaxed">
          <li>
            No aceptamos apoyos de partidos, candidaturas, sus fundaciones, candidatos ni cargos
            públicos. Antes de pagar hay que confirmarlo; si llega uno, se devuelve.
          </li>
          <li>Apoyar no cambia nada del contenido: ni los análisis, ni el orden, ni el chat.</li>
          <li>En el tablón solo salen nombres: sin logos, enlaces ni mensajes, tampoco de empresas.</li>
          <li>
            Los nombres con siglas de partidos, lemas, insultos o enlaces salen como anónimos, y
            podemos ocultar cualquier nombre.
          </li>
          <li>
            ¿Quieres quitar o cambiar tu nombre? Escríbenos
            {t0 ? (
              <>
                {" "}a{" "}
                <a className="underline" href={`mailto:${t0.email}`}>
                  {t0.email}
                </a>
              </>
            ) : (
              <>
                {" "}(datos en el{" "}
                <Link className="underline" href="/condiciones">
                  aviso legal
                </Link>
                )
              </>
            )}{" "}
            y lo retiramos en menos de 7 días.
          </li>
        </ul>
      </section>
    </div>
  );
}
