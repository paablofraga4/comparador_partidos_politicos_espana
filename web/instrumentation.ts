/**
 * Al arrancar el servidor en producción, prepara la base del chat (migraciones + índices) en un
 * proceso aparte y sin esperar: la web sirve desde el primer momento. No depende de que Railway
 * ejecute el pre-deploy, y si la base se reinicia vacía, se rehace sola. Es idempotente e
 * incremental por hash: si el pre-deploy ya lo hizo, esta pasada no cambia nada.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { prepararBase } = await import("./instrumentation-node");
    prepararBase();
  }
}
