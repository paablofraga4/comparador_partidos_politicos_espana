import Link from "next/link";

import { Wordmark } from "./brand";
import { LecturaFacilToggle } from "./lectura-facil";

const NAV = [
  { href: "/comparar", label: "Comparar" },
  { href: "/partidos", label: "Partidos" },
  { href: "/temas", label: "Temas" },
  { href: "/metodologia", label: "Cómo lo hacemos" },
];

export function SiteHeader() {
  return (
    <header className="border-rule bg-paper/90 supports-[backdrop-filter]:bg-paper/75 sticky top-0 z-30 border-b backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-2 sm:px-6">
        <Link href="/" className="shrink-0 py-2" aria-label="VotoClaro, inicio">
          <Wordmark />
        </Link>
        <nav aria-label="Principal" className="ml-2 hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="text-ink-muted hover:text-ink rounded-md px-3 py-2 text-sm font-medium transition-colors"
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto">
          <LecturaFacilToggle />
        </div>
      </div>
      <nav
        aria-label="Principal (móvil)"
        className="border-rule flex gap-1 overflow-x-auto border-t px-2 md:hidden"
      >
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className="text-ink-muted hover:text-ink shrink-0 px-3 py-2.5 text-sm font-medium"
          >
            {n.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
