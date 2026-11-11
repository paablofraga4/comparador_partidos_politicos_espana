import { ArrowRight, Columns3, MapPin, MessageCircleQuestion } from "lucide-react";
import Link from "next/link";

import type { Candidatura, Fuente } from "@/lib/types";
import { Papeleta } from "./papeleta";
import { Candidato } from "./piezas";

const tarjeta =
  "border-rule bg-paper-raised flex h-full flex-col gap-3 rounded-lg border p-5 transition-colors";

/**
 * Lo que se puede hacer en la web, a la vista (spec 007, HU-7.1): tarjetas del mismo tamaño y
 * formato. La de la IA solo si el chat está activo (se decide en el build: la portada es estática).
 */
export function TarjetasEntrada({
  chat,
  provincias,
}: {
  chat: boolean;
  provincias: { id: string; nombre: string }[];
}) {
  return (
    <section className="mx-auto max-w-6xl px-4 pt-12 sm:px-6" aria-label="Qué puedes hacer">
      <ul className={`grid gap-3 ${chat ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
        <li>
          <Link href="/comparar" className={`${tarjeta} hover:border-rule-strong`}>
            <Columns3 aria-hidden className="h-6 w-6" strokeWidth={1.75} />
            <span className="font-serif text-xl">Compara por temas</span>
            <span className="text-ink-muted">
              Elige partidos y temas y mira sus propuestas una al lado de otra, con la página de
              cada una.
            </span>
            <span className="mt-auto inline-flex items-center gap-1 text-sm font-semibold">
              Ir al comparador <ArrowRight aria-hidden className="h-4 w-4" />
            </span>
          </Link>
        </li>
        {chat && (
          <li>
            <Link href="/pregunta" className={`${tarjeta} hover:border-rule-strong`}>
              <MessageCircleQuestion aria-hidden className="h-6 w-6" strokeWidth={1.75} />
              <span className="font-serif text-xl">Pregúntale a la IA</span>
              <span className="text-ink-muted">
                Pregunta con tus palabras, por ejemplo: «¿Qué proponen los partidos sobre
                vivienda?». Responde solo con los programas y te da la fuente.
              </span>
              <span className="mt-auto inline-flex items-center gap-1 text-sm font-semibold">
                Hacer una pregunta <ArrowRight aria-hidden className="h-4 w-4" />
              </span>
            </Link>
          </li>
        )}
        <li>
          <div className={tarjeta}>
            <MapPin aria-hidden className="h-6 w-6" strokeWidth={1.75} />
            <span className="font-serif text-xl">Tu papeleta</span>
            <span className="text-ink-muted">
              Las candidaturas al Congreso de tu provincia, según el BOE.
            </span>
            {provincias.length > 0 ? (
              <Papeleta provincias={provincias} compacta />
            ) : (
              <Link
                href="/tu-papeleta"
                className="mt-auto inline-flex min-h-11 items-center gap-1 text-sm font-semibold"
              >
                Ver tu papeleta <ArrowRight aria-hidden className="h-4 w-4" />
              </Link>
            )}
          </div>
        </li>
      </ul>
    </section>
  );
}

/** «disponible desde el 11 de noviembre» (fecha de carga en VotoClaro, spec 007). */
function fechaCarga(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    timeZone: "Europe/Madrid",
  });
}

/**
 * Programas del 29N ya publicados (spec 007, HU-7.2): informativo, en orden alfabético y con el
 * mismo formato para todos; no ordena por fecha ni destaca a nadie (constitución I.2).
 */
export function ProgramasPublicados({
  publicados,
  pendientes,
}: {
  publicados: { c: Candidatura; fuente: Fuente | null }[];
  pendientes: Candidatura[];
}) {
  if (!publicados.length) return null;
  return (
    <section className="mx-auto max-w-6xl px-4 pt-14 sm:px-6" aria-labelledby="publicados-h">
      <h2 id="publicados-h" className="text-3xl font-medium">
        Programas del 29N ya publicados
      </h2>
      <p className="text-ink-muted mt-2">
        En cuanto un partido publica su programa, lo leemos entero y lo añadimos. Orden alfabético.
      </p>
      <ul className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {publicados.map(({ c, fuente }) => (
          <li key={c.id}>
            <Link
              href={`/partidos/${c.id}`}
              className="border-rule bg-paper-raised hover:border-rule-strong flex h-full flex-col gap-1 rounded-lg border px-4 py-3 transition-colors"
              style={{ borderLeft: `4px solid ${c.color}` }}
            >
              <Candidato c={c} className="font-semibold" />
              <span className="text-sm">Programa 29N</span>
              {fuente && (
                <span className="text-ink-muted text-xs">
                  {fuente.paginas} págs. · disponible desde el {fechaCarga(fuente.descargado)}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
      {pendientes.length > 0 && (
        <p className="text-ink-muted mt-4 text-sm">
          Aún sin programa del 29N:{" "}
          {pendientes.map((c, i) => (
            <span key={c.id}>
              {i > 0 && ", "}
              <Link href={`/partidos/${c.id}`} className="underline-offset-4 hover:underline">
                {c.corto}
              </Link>
            </span>
          ))}
          .
        </p>
      )}
    </section>
  );
}
