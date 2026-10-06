import type { MetadataRoute } from "next";

import { urlDelSitio } from "@/lib/sitio";

/** robots.txt (spec 002, HU-2.9): todo indexable salvo la API y la página privada del bono. */
export default function robots(): MetadataRoute.Robots {
  const base = urlDelSitio(process.env.NEXT_PUBLIC_SITE_URL).origin;
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/bono"] },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
