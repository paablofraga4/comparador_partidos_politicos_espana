import { ChevronDown } from "lucide-react";

import type { Afirmacion, Analisis, Candidatura, ProgramaVigente, Propuesta } from "@/lib/types";
import { CONVOCATORIAS } from "@/lib/types";
import { CitaMark } from "./cita";
import { SegunLectura } from "./segun-lectura";

const REPO =
  process.env.NEXT_PUBLIC_GITHUB_REPO ?? "paablofraga4/comparador_partidos_politicos_espana";

function Citas({ ids, a, c }: { ids: string[]; a: Analisis; c: Candidatura }) {
  const conv = a.convocatoria as keyof typeof CONVOCATORIAS;
  return (
    <>
      {ids.map((cid) => {
        const cita = a.citas[cid];
        if (!cita) return null;
        return (
          <CitaMark
            key={cid}
            conv={a.convocatoria}
            cand={c.id}
            cid={cid}
            pagina={cita.pagina_impresa ?? String(cita.pagina)}
            candCorto={c.corto}
            convCorto={CONVOCATORIAS[conv]?.corto ?? a.convocatoria}
          />
        );
      })}
    </>
  );
}

function Resumen({ frases, a, c }: { frases: Afirmacion[]; a: Analisis; c: Candidatura }) {
  return (
    <p className="text-[1.0625rem] leading-relaxed">
      {frases.map((f, i) => (
        <span key={i}>
          {f.texto}
          <Citas ids={f.citas} a={a} c={c} />{" "}
        </span>
      ))}
    </p>
  );
}

function Propuestas({
  items,
  a,
  c,
  tema,
  abiertas,
}: {
  items: Propuesta[];
  a: Analisis;
  c: Candidatura;
  tema: string;
  abiertas: boolean;
}) {
  if (!items.length) return null;
  const lista = (
    <ul className="mt-3 space-y-2.5">
      {items.map((p) => {
        const issue = new URL(`https://github.com/${REPO}/issues/new`);
        issue.searchParams.set("title", `Error en ${c.corto} · ${tema} · ${p.id}`);
        issue.searchParams.set(
          "body",
          `Candidatura: ${c.nombre}\nConvocatoria: ${a.convocatoria}\nTema: ${tema}\nPropuesta (${p.id}): ${p.texto}\n\n¿Qué está mal?\n`,
        );
        return (
          <li key={p.id} className="group relative pl-4">
            <span
              aria-hidden
              className="bg-ink-faint absolute top-[0.7em] left-0 h-1 w-1 rounded-full"
            />
            {p.texto}
            <Citas ids={p.citas} a={a} c={c} />
            <a
              href={issue.toString()}
              target="_blank"
              rel="noreferrer"
              className="text-ink-faint ml-1 text-xs opacity-0 transition-opacity group-hover:opacity-100 hover:underline focus-visible:opacity-100"
            >
              ¿Ves un error?
            </a>
          </li>
        );
      })}
    </ul>
  );
  return (
    <details className="group/d mt-3" open={abiertas}>
      <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1 text-sm font-semibold select-none">
        <ChevronDown aria-hidden className="h-4 w-4 transition-transform group-open/d:rotate-180" />
        {items.length === 1 ? "Ver 1 propuesta" : `Ver ${items.length} propuestas`}
      </summary>
      {lista}
    </details>
  );
}

/** Lo que dice una candidatura sobre un tema, con su fuente (specs 001-002). */
export function BloqueTema({
  c,
  v,
  temaId,
  temaNombre,
  abiertas = false,
}: {
  c: Candidatura;
  v: ProgramaVigente;
  temaId: string;
  temaNombre: string;
  abiertas?: boolean;
}) {
  if (v.tipo === "pendiente") {
    return (
      <p className="text-ink-muted">
        Aún no ha publicado su programa para el 29N.
        {v.dentroDe && (
          <span className="block text-sm">
            En 2023 concurrió dentro de otra candidatura, por eso no mostramos un programa anterior
            propio.
          </span>
        )}
      </p>
    );
  }
  const a = v.analisis;
  const t = a.temas[temaId];
  if (!t || !t.menciona) {
    return (
      <p className="text-ink-muted italic">
        No lo menciona en su programa.{" "}
        <a
          className="decoration-rule-strong hover:decoration-ink not-italic underline underline-offset-2"
          href={`/programas/${c.id}/${a.convocatoria}`}
        >
          Comprobar en el documento
        </a>
      </p>
    );
  }
  const lf = t.lectura_facil;
  return (
    <SegunLectura
      normal={
        <>
          <Resumen frases={t.resumen ?? []} a={a} c={c} />
          <Propuestas
            items={t.propuestas ?? []}
            a={a}
            c={c}
            tema={temaNombre}
            abiertas={abiertas}
          />
        </>
      }
      facil={
        lf && (lf.resumen?.length || lf.propuestas?.length) ? (
          <>
            <Resumen frases={lf.resumen ?? []} a={a} c={c} />
            <Propuestas
              items={lf.propuestas ?? []}
              a={a}
              c={c}
              tema={temaNombre}
              abiertas={abiertas}
            />
          </>
        ) : null
      }
    />
  );
}
