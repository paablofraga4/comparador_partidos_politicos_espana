import {
  Baby,
  Briefcase,
  ChevronDown,
  Cpu,
  Earth,
  Globe,
  GraduationCap,
  HandHeart,
  House,
  Landmark,
  Leaf,
  MapIcon,
  PiggyBank,
  Receipt,
  Scale,
  Shield,
  Sparkles,
  Stethoscope,
  TrainFront,
  Wheat,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import type { Candidatura, ProgramaVigente } from "@/lib/types";
import { CONVOCATORIAS } from "@/lib/types";

const ICONOS: Record<string, LucideIcon> = {
  house: House,
  briefcase: Briefcase,
  receipt: Receipt,
  "piggy-bank": PiggyBank,
  "hand-heart": HandHeart,
  stethoscope: Stethoscope,
  "graduation-cap": GraduationCap,
  globe: Globe,
  leaf: Leaf,
  wheat: Wheat,
  "train-front": TrainFront,
  scale: Scale,
  baby: Baby,
  sparkles: Sparkles,
  cpu: Cpu,
  shield: Shield,
  map: MapIcon,
  landmark: Landmark,
  earth: Earth,
};

export function TemaIcono({ icono, className = "h-5 w-5" }: { icono: string; className?: string }) {
  const Icon = ICONOS[icono] ?? Sparkles;
  return <Icon aria-hidden className={className} strokeWidth={1.75} />;
}

/** Punto de color + nombre: el color nunca va solo (constitución I.5). */
export function Candidato({ c, className = "" }: { c: Candidatura; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span
        aria-hidden
        className="inline-block h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10"
        style={{ background: c.color }}
      />
      <span>{c.corto}</span>
    </span>
  );
}

/**
 * El resto de las candidaturas del BOE, plegadas bajo las principales (constitución I.6): siguen
 * en la web, con el mismo trato, en orden alfabético y con su enlace.
 */
export function OtrasCandidaturas({
  cands,
  href,
  className = "",
}: {
  cands: Candidatura[];
  href: (c: Candidatura) => string;
  className?: string;
}) {
  if (!cands.length) return null;
  return (
    <details className={`group/o ${className}`}>
      <summary className="hover:text-ink text-ink-muted inline-flex min-h-11 cursor-pointer list-none items-center gap-1 font-semibold select-none">
        <ChevronDown aria-hidden className="h-4 w-4 transition-transform group-open/o:rotate-180" />
        Otras candidaturas del BOE ({cands.length})
      </summary>
      <p className="text-ink-muted mt-1 text-sm">
        Las demás candidaturas al Congreso publicadas en el BOE, en orden alfabético.{" "}
        <Link href="/metodologia#criterio" className="underline">
          Por qué van aquí
        </Link>
      </p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {cands.map((c) => (
          <li key={c.id}>
            <Link
              href={href(c)}
              className="border-rule bg-paper-raised hover:border-rule-strong inline-flex min-h-10 items-center rounded-full border px-3 text-sm"
            >
              <Candidato c={c} />
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
}

/** Aviso de las fichas cuando se muestra el programa de 2023 (constitución III.2; spec 001). */
export function AvisoProgramaAnterior({ c, v }: { c: Candidatura; v: ProgramaVigente }) {
  if (v.tipo !== "programa" || !v.anterior) return null;
  return (
    <p className="border-notice-rule bg-notice-bg text-notice-ink mt-4 rounded-md border p-3 text-sm">
      {v.de
        ? `Estás viendo el programa de las generales de 2023 de ${v.de.corto}, la coalición de la que procede ${c.corto}: su texto es de ${v.de.corto}, no de ${c.corto}.`
        : "Estás viendo el programa de las generales de 2023."}{" "}
      Cuando {c.corto} publique su programa para el 29N lo analizaremos y lo sustituiremos aquí.
    </p>
  );
}

/** Origen del programa mostrado (spec 002, HU-2.6). */
export function ProgramaBadge({ v }: { v: ProgramaVigente }) {
  if (v.tipo === "pendiente") {
    return (
      <span className="border-rule text-ink-muted inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs">
        Pendiente del programa del 29N
      </span>
    );
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {v.anterior ? (
        <span className="border-notice-rule bg-notice-bg text-notice-ink inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium">
          {v.de
            ? `Programa de 2023 de ${v.de.corto} (coalición anterior) · pendiente del 29N`
            : "Programa de 2023 (anterior) · pendiente del 29N"}
        </span>
      ) : (
        <span className="border-rule inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium">
          Programa {CONVOCATORIAS[v.convocatoria].corto}
        </span>
      )}
      {v.borrador && (
        <span className="bg-ink text-paper inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase">
          Borrador · vista previa
        </span>
      )}
    </span>
  );
}
