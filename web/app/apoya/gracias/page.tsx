import type { Metadata } from "next";
import Link from "next/link";

import { urlPortal } from "@/lib/apoyos/config";
import { CORREO_CONTACTO } from "@/lib/autor";

export const metadata: Metadata = {
  title: "Gracias por apoyar VotoClaro",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

const NOMBRE: Record<string, string> = {
  publico: "Tu nombre saldrá en el tablón de apoyos.",
  anonimo: "Tu apoyo cuenta en los totales, sin tu nombre.",
  filtrado: `Tu apoyo cuenta, pero el nombre que escribiste no saldrá en el tablón: incluye siglas de partidos, un lema, un insulto o un enlace. Si crees que es un error, escríbenos a ${CORREO_CONTACTO}.`,
};

/** Agradecimiento tras el pago (spec 005, HU-5.4). La URL solo dice el tipo y el estado del nombre. */
export default async function Gracias({ searchParams }: PageProps<"/apoya/gracias">) {
  const q = await searchParams;
  const mensual = q.tipo === "mensual";
  const nombre = NOMBRE[typeof q.nombre === "string" ? q.nombre : ""] ?? NOMBRE.anonimo;
  const portal = urlPortal();
  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
      <h1 className="text-4xl font-medium sm:text-5xl">Gracias por apoyar VotoClaro</h1>
      <p className="text-ink-muted mt-5 text-lg leading-relaxed">
        Con tu apoyo ayudas a pagar el servidor, la IA del chat y el dominio. {nombre}
      </p>
      {mensual && (
        <p className="text-ink-muted mt-4 leading-relaxed">
          Stripe te enviará un recibo cada mes. Puedes cancelarlo cuando quieras
          {portal ? (
            <>
              :{" "}
              <a href={portal} className="text-ink font-medium underline underline-offset-4">
                gestionar o cancelar mi apoyo
              </a>
            </>
          ) : (
            " desde el enlace del recibo"
          )}
          .
        </p>
      )}
      <Link
        href="/apoya#tablon"
        className="bg-ink text-paper mt-8 inline-flex min-h-11 items-center rounded-xl px-5 font-medium"
      >
        Ver el tablón
      </Link>
    </div>
  );
}
