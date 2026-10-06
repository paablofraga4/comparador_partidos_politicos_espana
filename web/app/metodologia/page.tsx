import type { Metadata } from "next";
import Link from "next/link";

import { Candidato } from "@/components/piezas";
import { analisis, candidaturas, fuente, registro } from "@/lib/data";
import type { ConvocatoriaId } from "@/lib/types";
import { metaPagina } from "@/lib/seo";

export const metadata: Metadata = metaPagina({
  titulo: "Cómo lo hacemos",
  descripcion:
    "Metodología de VotoClaro: criterio de inclusión, fuentes, verificación de citas, neutralidad, lectura fácil y estado de cada programa.",
  ruta: "/metodologia",
});

const REPO = `https://github.com/${process.env.NEXT_PUBLIC_GITHUB_REPO ?? "paablofraga4/comparador_partidos_politicos_espana"}`;

function fecha(iso?: string | null) {
  return iso
    ? new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })
    : "—";
}

function Estado({ conv, cand }: { conv: ConvocatoriaId; cand: string }) {
  const f = fuente(conv, cand);
  const a = analisis(conv, cand);
  if (!f) return <span className="text-ink-faint">pendiente</span>;
  return (
    <span className="tabular">
      <a href={f.url} className="underline" target="_blank" rel="noreferrer">
        {a?.estado === "aprobado" ? "aprobado" : a ? "en revisión" : "publicado"}
      </a>
      <span className="text-ink-faint block text-xs">
        archivado {fecha(f.descargado)}
        {a?.aprobado_en ? ` · aprobado ${fecha(a.aprobado_en)}` : ""}
      </span>
    </span>
  );
}

export default function Metodologia() {
  const reg = registro();
  const cands = candidaturas();
  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-4xl font-medium sm:text-5xl">Cómo lo hacemos</h1>
      <p className="text-ink-muted mt-4 text-lg">
        VotoClaro es un proyecto independiente y de código abierto. Estas son sus reglas, y puedes
        comprobar que se cumplen en el{" "}
        <a className="underline" href={REPO}>
          repositorio público
        </a>
        .
      </p>

      <section className="mt-10 space-y-3" id="principios">
        <h2 className="text-2xl font-medium">Principios</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Nada sin fuente.</strong> Cada frase enlaza a la página exacta del programa
            oficial. Un sistema automático comprueba que cada cita aparece literalmente en el
            documento; si no, no se publica.
          </li>
          <li>
            <strong>Mismo trato para todos.</strong> Misma estructura y extensión máxima, orden
            alfabético y lenguaje descriptivo, sin adjetivos que valoren.
          </li>
          <li>
            <strong>Solo el programa oficial.</strong> Sin prensa, entrevistas ni redes. Si un
            partido no habla de un tema, lo decimos: «No lo menciona en su programa».
          </li>
          <li>
            <strong>No recomendamos a quién votar</strong> ni valoramos las propuestas.
          </li>
        </ul>
      </section>

      <section className="mt-10 space-y-3" id="criterio">
        <h2 className="text-2xl font-medium">Qué partidos aparecen</h2>
        <p>
          La fuente es el <strong>Boletín Oficial del Estado</strong>. Cuando el BOE publique las
          candidaturas al Congreso (hacia el 28 de octubre) aparecerán <strong>todas</strong>, sin
          filtro, y podrás ver las de tu provincia. Hasta entonces mostramos, de forma provisional,
          las candidaturas con representación en las Cortes en la XV legislatura.
        </p>
        <p className="text-ink-muted text-sm">
          Fase actual: <strong>{reg.fase_inclusion}</strong>.
        </p>
      </section>

      <section className="mt-10 space-y-3" id="analisis">
        <h2 className="text-2xl font-medium">Cómo analizamos cada programa</h2>
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            Archivamos el PDF oficial (con su huella digital y una copia en Internet Archive).
          </li>
          <li>
            Una inteligencia artificial lee el programa <strong>completo</strong> para cada uno de
            los 19 temas y extrae un resumen y las propuestas más concretas, con su cita literal.
          </li>
          <li>
            Verificamos automáticamente cada cita contra el texto del PDF. Si un tema sale como «no
            lo menciona», hacemos una segunda búsqueda por si se nos escapó algo.
          </li>
          <li>
            Revisores automáticos de neutralidad y de citas, y una persona, revisan el resultado
            antes de publicarlo. Todo cambio queda registrado en el historial público.
          </li>
        </ol>
      </section>

      <section className="mt-10 space-y-3" id="lectura-facil">
        <h2 className="text-2xl font-medium">Lectura fácil</h2>
        <p>
          Cada resumen tiene una versión con frases cortas y palabras comunes. Se genera
          automáticamente siguiendo las pautas de la norma UNE 153101 EX y se comprueba con reglas
          automáticas (longitud de frases, índice de legibilidad INFLESZ, siglas). Está{" "}
          <strong>pendiente de validación con personas usuarias</strong>, como exige la norma; por
          eso la marcamos como «adaptación automática».
        </p>
      </section>

      <section className="mt-10" id="estado">
        <h2 className="text-2xl font-medium">Estado de los programas</h2>
        <p className="text-ink-muted mt-2 text-sm">
          Mientras un partido no publique su programa del 29N, mostramos el de 2023 (si concurrió
          con programa propio) avisando de que es el anterior.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-rule-strong border-b">
              <tr>
                <th className="py-2 pr-4 font-semibold">Partido</th>
                <th className="py-2 pr-4 font-semibold">Programa 29N</th>
                <th className="py-2 font-semibold">Programa 2023</th>
              </tr>
            </thead>
            <tbody>
              {cands.map((c) => {
                const c23 = c.convocatorias["generales-2023"];
                return (
                  <tr key={c.id} className="border-rule border-b align-top">
                    <td className="py-2 pr-4">
                      <Link href={`/partidos/${c.id}`} className="hover:underline">
                        <Candidato c={c} />
                      </Link>
                    </td>
                    <td className="py-2 pr-4">
                      <Estado conv="generales-2026" cand={c.id} />
                    </td>
                    <td className="py-2">
                      {c23?.dentro_de ? (
                        <span className="text-ink-faint">dentro de otra candidatura</span>
                      ) : c23?.programa_propio === false ? (
                        <span className="text-ink-faint">sin programa propio</span>
                      ) : (
                        <Estado conv="generales-2023" cand={c.id} />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10 space-y-3" id="errores">
        <h2 className="text-2xl font-medium">¿Has visto un error?</h2>
        <p>
          En cada propuesta tienes un enlace «¿Ves un error?». También puedes{" "}
          <a className="underline" href={`${REPO}/issues/new`}>
            abrir una incidencia
          </a>
          . Corregimos por el mismo proceso de verificación y queda registrado.
        </p>
      </section>

      <section className="mt-10 space-y-3" id="privacidad">
        <h2 className="text-2xl font-medium">Privacidad</h2>
        <p>
          Sin cuentas, sin cookies de seguimiento y sin anuncios. Tus preferencias (como la lectura
          fácil) se guardan solo en tu navegador.
        </p>
        <p>
          <strong>El asistente</strong> no guarda el texto de tus preguntas: las preguntas sobre
          política pueden revelar opiniones, y no queremos tenerlas. Para repartir las preguntas
          gratis usa dos medidas técnicas, sin publicidad ni seguimiento:
        </p>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            una cookie aleatoria (<code>vc_uso</code>) que solo cuenta cuántas preguntas gratis has
            hecho en este navegador; guardamos su huella cifrada, no la cookie;
          </li>
          <li>
            un máximo diario por conexión, calculado con una huella cifrada de la IP que cambia cada
            día (la IP nunca se guarda).
          </li>
        </ul>
        <p>
          Si compras un bono, su código se guarda en otra cookie técnica (<code>vc_bono</code>). El
          pago lo procesa Stripe; nosotros no guardamos tu nombre, tu email ni los datos de tu
          tarjeta. Más en las{" "}
          <Link className="underline" href="/condiciones">
            condiciones de los bonos
          </Link>
          .
        </p>
      </section>
    </article>
  );
}
