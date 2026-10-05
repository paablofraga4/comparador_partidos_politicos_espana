// Copia a public/ lo que la web sirve como estático (no se versiona en web/):
//  - data/documents/**  → public/documentos/**   (PDFs de los programas; soporta Range)
//  - worker de pdf.js   → public/pdf.worker.min.mjs
import { cpSync, existsSync, mkdirSync, copyFileSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const web = path.resolve(import.meta.dirname, "..");
const data = process.env.VC_DATA_DIR ?? path.resolve(web, "..", "data");

const docs = path.join(data, "documents");
if (existsSync(docs)) {
  cpSync(docs, path.join(web, "public", "documentos"), { recursive: true, filter: (s) => !s.endsWith(".gitkeep") });
}
mkdirSync(path.join(web, "public"), { recursive: true });
const worker = require.resolve("pdfjs-dist/build/pdf.worker.min.mjs");
copyFileSync(worker, path.join(web, "public", "pdf.worker.min.mjs"));
console.log("✓ assets sincronizados (documentos + worker de pdf.js)");
