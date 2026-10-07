import { datosMigas, type Miga } from "@/lib/seo";
import { urlDelSitio } from "@/lib/sitio";

/** Datos estructurados (schema.org) para buscadores. Se escapa «<» para no cerrar el script. */
export function JsonLd({ datos }: { datos: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(datos).replace(/</g, "\\u003c") }}
    />
  );
}

/** Migas de pan para Google (spec 002, HU-2.9). La primera miga es siempre el inicio. */
export function MigasJsonLd({ migas }: { migas: Miga[] }) {
  const base = urlDelSitio(process.env.NEXT_PUBLIC_SITE_URL).origin;
  return <JsonLd datos={datosMigas([{ nombre: "Inicio", ruta: "/" }, ...migas], base)} />;
}
