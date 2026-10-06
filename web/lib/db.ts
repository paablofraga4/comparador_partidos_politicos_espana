/**
 * Acceso a Postgres con un adaptador mínimo que funciona igual con:
 *  - Postgres real (Railway): DATABASE_URL=postgres://…
 *  - PGlite en proceso (desarrollo y tests, sin Docker): DATABASE_URL=pglite:memory | pglite:./.pglite
 * Sin "server-only": lo usan también los scripts de Node (migraciones, sync, evals).
 */
export type Db = {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
  exec(text: string): Promise<void>;
  end(): Promise<void>;
};

const g = globalThis as unknown as { __vcDb?: Promise<Db> };

export function hayDb(): boolean {
  return !!process.env.DATABASE_URL;
}

export function getDb(url = process.env.DATABASE_URL): Promise<Db> {
  if (!url) throw new Error("Falta DATABASE_URL");
  if (url === process.env.DATABASE_URL) {
    g.__vcDb ??= crear(url);
    return g.__vcDb;
  }
  return crear(url);
}

async function crear(url: string): Promise<Db> {
  if (url.startsWith("pglite:")) {
    const { PGlite } = await import("@electric-sql/pglite");
    const { vector } = await import("@electric-sql/pglite-pgvector");
    const ruta = url.slice("pglite:".length);
    const pg = new PGlite(
      ruta === "memory" ? { extensions: { vector } } : { dataDir: ruta, extensions: { vector } },
    );
    return {
      async query<T>(text: string, params: unknown[] = []) {
        return (await pg.query<T>(text, params)).rows;
      },
      async exec(text: string) {
        await pg.exec(text);
      },
      async end() {
        await pg.close();
      },
    };
  }
  const { default: postgres } = await import("postgres");
  const sql = postgres(url, { max: 5, idle_timeout: 20, onnotice: () => {} });
  return {
    async query<T>(text: string, params: unknown[] = []) {
      return (await sql.unsafe(text, params as never[])) as unknown as T[];
    },
    async exec(text: string) {
      await sql.unsafe(text);
    },
    async end() {
      await sql.end();
    },
  };
}

/** Formato de pgvector para un embedding. */
export const vec = (e: number[]) => `[${e.join(",")}]`;
