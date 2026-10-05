import {
  Baby,
  Briefcase,
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
          Programa de 2023 (anterior) · pendiente del 29N
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
