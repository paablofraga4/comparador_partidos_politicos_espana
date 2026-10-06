import type { Metadata } from "next";
import Link from "next/link";

import { Chat } from "@/components/chat";
import { estadoPagos } from "@/lib/bonos/pagos";
import { numeroEnv } from "@/lib/config";
import { candidaturas } from "@/lib/data";
import { hayDb } from "@/lib/db";

export const metadata: Metadata = {
  title: "Pregunta sobre los programas",
  description:
    "Pregunta en lenguaje natural qué proponen los partidos para el 29N. Cada respuesta cita la página exacta del programa oficial.",
};

export const dynamic = "force-dynamic";

export default async function Pregunta(props: PageProps<"/pregunta">) {
  const activo = hayDb() && process.env.CHAT_ACTIVO === "1";
  const { pago } = await props.searchParams;
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-4xl font-medium sm:text-5xl">Pregunta</h1>
      <p className="text-ink-muted mt-3 text-lg">
        Pregunta lo que quieras sobre los programas. Cada frase de la respuesta lleva su fuente:
        pulsa la marca de página para ver el texto original.
      </p>
      <ul className="text-ink-muted mt-4 space-y-1 text-sm">
        <li>· Solo responde con lo que dicen los programas oficiales.</li>
        <li>· No recomienda a quién votar ni valora propuestas.</li>
        <li>· No guardamos tus preguntas.</li>
        <li>
          · Tienes {numeroEnv("CHAT_GRATIS_TOTAL", 2)} preguntas gratis. El comparador es gratis y
          sin límite.
        </li>
      </ul>
      <div className="mt-8">
        {activo ? (
          <Chat
            candidaturas={candidaturas().map((c) => ({ id: c.id, corto: c.corto, color: c.color }))}
            maxChars={numeroEnv("CHAT_MAX_QUESTION_CHARS", 500)}
            pagosActivos={estadoPagos().activos}
            avisoPago={typeof pago === "string" ? pago : undefined}
          />
        ) : (
          <p className="border-rule bg-paper-raised rounded-lg border p-5">
            El asistente estará disponible muy pronto. Mientras tanto, puedes{" "}
            <Link className="underline" href="/comparar">
              comparar los programas por temas
            </Link>
            .
          </p>
        )}
      </div>
    </div>
  );
}
