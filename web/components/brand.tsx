/** Logotipo tipográfico: «Voto» + «Claro» subrayado con rotulador (el motivo de marca). */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-serif text-2xl font-semibold tracking-tight ${className}`}>
      Voto<span className="marker">Claro</span>
    </span>
  );
}
