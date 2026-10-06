"use client";

import { Check, Copy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { CanjearCodigo } from "./planes";

export function CopiarCodigo({ codigo }: { codigo: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(codigo);
        setCopiado(true);
        setTimeout(() => setCopiado(false), 1800);
      }}
      className="border-rule-strong hover:border-ink inline-flex min-h-11 items-center gap-2 rounded-md border px-4 font-medium"
    >
      {copiado ? (
        <Check aria-hidden className="h-4 w-4" />
      ) : (
        <Copy aria-hidden className="h-4 w-4" />
      )}
      {copiado ? "¡Copiado!" : "Copiar código"}
    </button>
  );
}

export function OlvidarBono() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        await fetch("/api/bonos/olvidar", { method: "POST" });
        router.refresh();
      }}
      className="text-ink-muted min-h-11 text-sm underline-offset-4 hover:underline"
    >
      Quitar el bono de este navegador
    </button>
  );
}

export function CanjearYRecargar() {
  const router = useRouter();
  return <CanjearCodigo abierto alCanjear={() => router.refresh()} />;
}
