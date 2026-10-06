import "server-only";

import { tool } from "ai";
import { z } from "zod";

import { buscarFragmentos, buscarPropuestas, type Ambito } from "../busqueda";
import { analisis, candidatura, candidaturas, temas, vigente } from "../data";
import type { Db } from "../db";
import { embedConsulta } from "../embeddings";
import { ordenAlfabetico } from "../reglas";
import { CONVOCATORIAS, type ConvocatoriaId, type ProgramaVigente } from "../types";
import { refCita, refFragmento, type FuenteChat } from "./refs";

type Registrar = (f: FuenteChat) => void;

const convCorto = (conv: string) => CONVOCATORIAS[conv as ConvocatoriaId]?.corto ?? conv;

function etiquetaPrograma(v: ProgramaVigente): string {
  if (v.tipo === "pendiente") return "Sin programa publicado para el 29N";
  return v.anterior
    ? "Programa de 2023 (anterior; aún no hay programa del 29N)"
    : `Programa ${convCorto(v.convocatoria)}`;
}

/** Herramientas del asistente (plan técnico D8). Cada fuente devuelta se registra para el cliente. */
export function herramientas({
  db,
  filtro,
  registrar,
}: {
  db: Db;
  filtro: string[];
  registrar: Registrar;
}) {
  const visibles = candidaturas();
  const permitidas = (ids?: string[]) => {
    const base = filtro.length ? visibles.filter((c) => filtro.includes(c.id)) : visibles;
    const pedidas = (ids ?? []).map((x) => x.toLowerCase().trim()).filter(Boolean);
    return ordenAlfabetico(pedidas.length ? base.filter((c) => pedidas.includes(c.id)) : base);
  };

  const fuenteCita = (cand: string, conv: string, cid: string): string | null => {
    const a = analisis(conv as ConvocatoriaId, cand);
    const cita = a?.citas[cid];
    const c = candidatura(cand);
    if (!cita || !c) return null;
    const ref = refCita(cand, conv, cid);
    registrar({
      ref,
      tipo: "cita",
      conv,
      cand,
      id: cid,
      pagina: cita.pagina_impresa ?? String(cita.pagina),
      candCorto: c.corto,
      convCorto: convCorto(conv),
    });
    return ref;
  };

  const ambito = (cands: ReturnType<typeof permitidas>, convocatoria: string): Ambito =>
    cands.flatMap((c) => {
      if (convocatoria !== "vigente") return [{ cand: c.id, conv: convocatoria }];
      const v = vigente(c);
      return v.tipo === "programa" ? [{ cand: c.id, conv: v.convocatoria }] : [];
    });

  const idsTema = temas().map((t) => t.id) as [string, ...string[]];
  const listaCandidaturas = z
    .array(z.string())
    .describe("ids de candidatura (p. ej. pp, psoe, sumar, vox…). Vacío = todas.");

  return {
    listar_candidaturas: tool({
      description:
        "Lista las candidaturas disponibles (ids y nombres) y qué programa se usa de cada una.",
      inputSchema: z.object({}),
      execute: async () =>
        permitidas().map((c) => ({
          id: c.id,
          nombre: c.nombre,
          corto: c.corto,
          programa: etiquetaPrograma(vigente(c)),
        })),
    }),

    obtener_analisis: tool({
      description:
        "Devuelve lo que dice el programa de cada candidatura sobre uno o varios temas: resumen y propuestas ya verificados, con sus refs de cita. Úsala primero para preguntas por tema.",
      inputSchema: z.object({
        candidaturas: listaCandidaturas,
        temas: z.array(z.enum(idsTema)).min(1).max(4).describe("ids de tema"),
      }),
      execute: async ({ candidaturas: ids, temas: tids }) =>
        permitidas(ids).flatMap((c) => {
          const v = vigente(c);
          return tids.map((tid) => {
            const base = { candidatura: c.corto, tema: tid, programa: etiquetaPrograma(v) };
            if (v.tipo === "pendiente") return { ...base, menciona: false };
            const t = v.analisis.temas[tid];
            if (!t?.menciona)
              return { ...base, menciona: false, nota: "No lo menciona en su programa" };
            const refs = (cids: string[]) =>
              cids.map((cid) => fuenteCita(c.id, v.convocatoria, cid)).filter(Boolean);
            return {
              ...base,
              menciona: true,
              resumen: (t.resumen ?? []).map((f) => ({ texto: f.texto, refs: refs(f.citas) })),
              propuestas: (t.propuestas ?? []).map((p) => ({
                texto: p.texto,
                refs: refs(p.citas),
              })),
            };
          });
        }),
    }),

    buscar_propuestas: tool({
      description:
        "Busca entre las propuestas y resúmenes verificados de los programas (búsqueda por palabras clave y por significado). Útil para preguntas transversales: «¿quién propone X?».",
      inputSchema: z.object({
        consulta: z.string().min(2).max(200).describe("palabras clave y sinónimos"),
        candidaturas: listaCandidaturas.optional(),
      }),
      execute: async ({ consulta, candidaturas: ids }) => {
        const cands = permitidas(ids);
        const r = await buscarPropuestas(db, {
          consulta,
          embedding: await embedConsulta(consulta),
          ambito: ambito(cands, "vigente"),
        });
        return r.map((p) => ({
          candidatura: candidatura(p.cand)?.corto ?? p.cand,
          programa: convCorto(p.conv),
          tema: p.tema,
          tipo: p.tipo,
          texto: p.texto,
          refs: p.citas.map((x) => fuenteCita(p.cand, p.conv, x.cid)).filter(Boolean),
        }));
      },
    }),

    buscar_en_programas: tool({
      description:
        "Busca en el TEXTO COMPLETO de los programas (fragmentos con su página). Úsala para detalles que no estén en las propuestas verificadas.",
      inputSchema: z.object({
        consulta: z.string().min(2).max(200).describe("palabras clave y sinónimos"),
        candidaturas: listaCandidaturas.optional(),
        convocatoria: z
          .enum(["vigente", "generales-2023", "generales-2026"])
          .default("vigente")
          .describe("«vigente» salvo que pregunten expresamente por otro año"),
      }),
      execute: async ({ consulta, candidaturas: ids, convocatoria }) => {
        const cands = permitidas(ids);
        const r = await buscarFragmentos(db, {
          consulta,
          embedding: await embedConsulta(consulta),
          ambito: ambito(cands, convocatoria),
        });
        return r.map((f) => {
          const c = candidatura(f.cand);
          const ref = refFragmento(f.cand, f.conv, f.id);
          registrar({
            ref,
            tipo: "fragmento",
            conv: f.conv,
            cand: f.cand,
            id: f.id,
            pagina: f.etiqueta ?? String(f.pagina),
            candCorto: c?.corto ?? f.cand,
            convCorto: convCorto(f.conv),
          });
          return {
            ref,
            candidatura: c?.corto ?? f.cand,
            programa: convCorto(f.conv),
            pagina: f.etiqueta ?? f.pagina,
            seccion: f.seccion,
            texto: f.texto.length > 1400 ? `${f.texto.slice(0, 1400)}…` : f.texto,
          };
        });
      },
    }),
  };
}
