import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";

import { CanjearYRecargar, CopiarCodigo, OlvidarBono } from "@/components/bono-acciones";
import { normalizarCodigo } from "@/lib/bonos/codigos";
import { COOKIE_BONO } from "@/lib/bonos/cookies";
import { bonoPorCodigo, bonoUsable } from "@/lib/bonos/cupo";
import { fechaCaducidad, planPorId } from "@/lib/bonos/planes";
import { getDb, hayDb } from "@/lib/db";

export const metadata: Metadata = {
  title: "Tu bono",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

/** Tu bono (spec 004, HU-4.5 y HU-4.6): código, preguntas que quedan y caducidad. */
export default async function PaginaBono(props: PageProps<"/bono">) {
  const { nuevo } = await props.searchParams;
  const codigo = normalizarCodigo((await cookies()).get(COOKIE_BONO)?.value ?? "");
  const bono = codigo && hayDb() ? await bonoPorCodigo(await getDb(), codigo) : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-4xl font-medium sm:text-5xl">Tu bono</h1>

      {bono && codigo ? (
        <>
          {nuevo && bono.estado === "activo" && (
            <p role="status" className="mt-4 text-lg">
              ¡Listo! Tu bono está activo. Gracias por ayudar a mantener VotoClaro.
            </p>
          )}
          <section className="border-rule-strong bg-paper-raised mt-6 rounded-2xl border p-5 sm:p-6">
            <p className="text-ink-muted text-sm font-semibold tracking-wide uppercase">
              {planPorId(bono.plan)?.nombre ?? "Bono"}
            </p>
            <p className="tabular mt-2 font-mono text-2xl font-semibold tracking-wider sm:text-3xl">
              {codigo}
            </p>
            <p className="mt-3 text-lg">{estadoTexto(bono)}</p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <CopiarCodigo codigo={codigo} />
              {bonoUsable(bono) && (
                <Link
                  href="/pregunta"
                  className="bg-ink text-paper inline-flex min-h-11 items-center rounded-md px-5 font-semibold"
                >
                  Ir a preguntar
                </Link>
              )}
            </div>
          </section>
          <div className="text-ink-muted mt-6 space-y-3 leading-relaxed">
            <p>
              <strong className="text-ink">Guarda este código.</strong> Te sirve para usar el bono
              en otro dispositivo o si borras los datos del navegador. También aparece en el recibo
              de Stripe.
            </p>
            <p>No guardamos tu nombre ni tu email: sin el código no podemos recuperar el bono.</p>
          </div>
          <div className="mt-6">
            <OlvidarBono />
          </div>
        </>
      ) : (
        <>
          <p className="text-ink-muted mt-4 text-lg">
            No hay ningún bono guardado en este navegador. Si ya compraste uno, escribe su código
            (está en la página que viste al pagar y en el recibo de Stripe).
          </p>
          <div className="mt-6">
            <CanjearYRecargar />
          </div>
        </>
      )}
    </div>
  );
}

function estadoTexto(b: NonNullable<Awaited<ReturnType<typeof bonoPorCodigo>>>): string {
  if (b.estado === "anulado") return "Este bono se anuló porque se devolvió el pago.";
  if (b.estado === "pendiente") return "Estamos esperando la confirmación del pago.";
  if (b.caduca <= new Date()) return `Caducó el ${fechaCaducidad(b.caduca)}.`;
  const quedan = b.total - b.usadas;
  return `Te quedan ${quedan} de ${b.total} preguntas · válido hasta el ${fechaCaducidad(b.caduca)}.`;
}
