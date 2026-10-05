import Link from "next/link";

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
          <li>Código: licencia MIT · Análisis: CC BY 4.0</li>
          <li>Los programas electorales pertenecen a sus partidos.</li>
        </ul>
      </div>
    </footer>
  );
}
