import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Despliegue en Railway con Docker (plan técnico D11)
  output: "standalone",
  // Monorepo: el build lee ../data
  outputFileTracingRoot: path.resolve(__dirname, ".."),
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/documentos/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
      },
    ];
  },
};

export default nextConfig;
