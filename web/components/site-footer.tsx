import Link from "next/link";

import { ANIO_COPYRIGHT, AUTOR } from "@/lib/autor";

import { Wordmark } from "./brand";

const REPO = `https://github.com/${process.env.NEXT_PUBLIC_GITHUB_REPO ?? "paablofraga4/comparador_partidos_politicos_espana"}`;

export function SiteFooter() {
  return (
    <footer className="border-rule bg-paper-sunken mt-24 border-t">
      <div className="text-ink-muted mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm sm:px-6 md:grid-cols-3">
        <div className="space-y-3">
          <Wordmark className="text-ink text-xl" />
          <p>
            Proyecto independiente, sin relación con ningún partido ni institución. Sin anuncios,
            sin cuentas y sin rastreo.
          </p>
        </div>
        <ul className="space-y-2">
          <li>
            <Link className="hover:text-ink" href="/elecciones-generales-2026">
              Elecciones generales 2026: fechas y partidos
            </Link>
          </li>
          <li>
            <Link className="hover:text-ink" href="/metodologia">
              Cómo lo hacemos y criterios
            </Link>
          </li>
          <li>
            <Link className="hover:text-ink" href="/metodologia#estado">
              Estado de los programas
            </Link>
          </li>
          <li>
            <a className="hover:text-ink" href={`${REPO}/issues/new`}>
              ¿Has visto un error? Avísanos
            </a>
          </li>
        </ul>
        <ul className="space-y-2">
          <li>
            <a className="hover:text-ink" href={REPO}>
              Código abierto en GitHub
            </a>
          </li>
          <li>
            <Link className="hover:text-ink" href="/condiciones">
              Aviso legal y condiciones
            </Link>
          </li>
          <li>Código: licencia MIT · Análisis: CC BY 4.0</li>
          <li>Los programas electorales pertenecen a sus partidos.</li>
        </ul>
      </div>
      {/* Autoría (spec 005, HU-5.1): discreta, al final de todo */}
      <div className="border-rule border-t">
        <p className="text-ink-muted mx-auto max-w-6xl px-4 py-4 text-xs sm:px-6">
          © {ANIO_COPYRIGHT}{" "}
          <a
            className="hover:text-ink underline-offset-2 hover:underline"
            href={AUTOR.linkedin}
            rel="author noopener"
          >
            {AUTOR.nombre}
            <span className="sr-only"> (perfil de LinkedIn)</span>
          </a>
        </p>
      </div>
    </footer>
  );
}
