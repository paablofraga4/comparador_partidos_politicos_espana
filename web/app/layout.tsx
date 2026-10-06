import type { Metadata, Viewport } from "next";
import { Newsreader, Public_Sans } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Suspense } from "react";

import { FuentePanel } from "@/components/fuente-panel";
import { LECTURA_SCRIPT } from "@/components/lectura-facil";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { urlDelSitio } from "@/lib/sitio";
import "./globals.css";

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  display: "swap",
  axes: ["opsz"],
});
const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-public-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: urlDelSitio(process.env.NEXT_PUBLIC_SITE_URL),
  title: {
    default: "VotoClaro · Qué propone cada partido el 29N",
    template: "%s · VotoClaro",
  },
  description:
    "Entiende los programas electorales del 29N: las propuestas de cada partido, tema a tema, explicadas claro y con la página exacta del programa oficial.",
  openGraph: {
    type: "website",
    locale: "es_ES",
    siteName: "VotoClaro",
  },
  twitter: { card: "summary_large_image" },
  // Google Search Console (propiedad por prefijo de URL): el token va en una variable
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
    : undefined,
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf8f3" },
    { media: "(prefers-color-scheme: dark)", color: "#121316" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      className={`${newsreader.variable} ${publicSans.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Aplica el modo de lectura guardado antes de pintar (sin parpadeo) */}
        <script dangerouslySetInnerHTML={{ __html: LECTURA_SCRIPT }} />
      </head>
      <body className="flex min-h-dvh flex-col antialiased">
        <NuqsAdapter>
          <a
            href="#contenido"
            className="focus:bg-paper-raised sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2"
          >
            Saltar al contenido
          </a>
          <SiteHeader />
          <main id="contenido" className="flex-1">
            {children}
          </main>
          <SiteFooter />
          <Suspense>
            <FuentePanel />
          </Suspense>
        </NuqsAdapter>
      </body>
    </html>
  );
}
