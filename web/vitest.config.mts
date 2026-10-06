import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["lib/**/*.test.ts", "components/**/*.test.ts"],
    environment: "node",
    testTimeout: 30000,
    pool: "forks",
    // PGlite y su extensión pgvector cargan binarios con import.meta.url: no transformarlos
    server: { deps: { external: [/@electric-sql\//] } },
  },
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
});
