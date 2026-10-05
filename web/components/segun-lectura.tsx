/** Muestra `normal` o `facil` según el modo activo (ambas en el HTML). */
export function SegunLectura({
  normal,
  facil,
}: {
  normal: React.ReactNode;
  facil: React.ReactNode | null;
}) {
  if (!facil) return <>{normal}</>;
  return (
    <>
      <div className="solo-normal">{normal}</div>
      <div className="solo-facil">
        {facil}
        <p className="text-ink-faint mt-3 text-xs">
          Adaptación automática a lectura fácil · en proceso de validación
        </p>
      </div>
    </>
  );
}
