/* Generado desde pipeline/src/votoclaro/models.py (vc schema). No editar a mano. */

export type Convocatoria = string;
export type Candidatura = string;
export type Estado = "borrador" | "aprobado";
export type AprobadoEn = string | null;
export type Id = string;
export type Sha256 = string;
export type Paginas = number;
export type Idioma = string;
export type Fecha = string;
export type Modelo = string;
export type ModeloLecturaFacil = string | null;
export type Prompt = string;
export type TokensEntrada = number;
export type TokensCache = number;
export type TokensSalida = number;
export type CosteUsd = number | null;
export type Menciona = boolean;
export type Texto = string;
/**
 * @minItems 1
 */
export type Citas = [string, ...string[]];
export type Resumen = Afirmacion[];
export type Texto1 = string;
/**
 * @minItems 1
 */
export type Citas1 = [string, ...string[]];
export type Id1 = string;
export type Subtema = string;
export type Propuestas = Propuesta[];
export type Resumen1 = Afirmacion[];
export type Propuestas1 = Propuesta[];
export type Inflesz = number;
export type MaxPalabrasFrase = number;
export type Ok = boolean;
export type Avisos = string[];
export type Fiel = boolean | null;
export type Ejecutada = boolean;
export type FragmentosRevisados = string[];
export type Reanalizado = boolean;
export type Chunk = string;
export type Pagina = number;
export type PaginaImpresa = string | null;
export type Literal = string;
export type Idioma1 = string;
export type Traduccion = string | null;
export type Pagina1 = number;
/**
 * @minItems 4
 * @maxItems 4
 */
export type R = [unknown, unknown, unknown, unknown];
export type Rects = Rect[];
export type Verificada = boolean;
export type Resaltada = boolean;
export type Incidencias = string[];

export interface Analisis {
  convocatoria: Convocatoria;
  candidatura: Candidatura;
  estado?: Estado;
  aprobado_en?: AprobadoEn;
  documento: DocumentoRef;
  generado: Generado;
  temas: Temas;
  citas: Citas2;
  incidencias?: Incidencias;
}
export interface DocumentoRef {
  id: Id;
  sha256: Sha256;
  paginas: Paginas;
  idioma: Idioma;
}
export interface Generado {
  fecha: Fecha;
  modelo: Modelo;
  modelo_lectura_facil?: ModeloLecturaFacil;
  prompt: Prompt;
  tokens_entrada?: TokensEntrada;
  tokens_cache?: TokensCache;
  tokens_salida?: TokensSalida;
  coste_usd?: CosteUsd;
}
export interface Temas {
  [k: string]: AnalisisTema;
}
export interface AnalisisTema {
  menciona: Menciona;
  resumen?: Resumen;
  propuestas?: Propuestas;
  lectura_facil?: LecturaFacil | null;
  red_seguridad?: RedSeguridad | null;
}
export interface Afirmacion {
  texto: Texto;
  citas: Citas;
}
export interface Propuesta {
  texto: Texto1;
  citas: Citas1;
  id: Id1;
  subtema: Subtema;
}
export interface LecturaFacil {
  resumen?: Resumen1;
  propuestas?: Propuestas1;
  legibilidad?: Legibilidad | null;
  fiel?: Fiel;
}
export interface Legibilidad {
  inflesz: Inflesz;
  max_palabras_frase: MaxPalabrasFrase;
  ok: Ok;
  avisos?: Avisos;
}
export interface RedSeguridad {
  ejecutada: Ejecutada;
  fragmentos_revisados?: FragmentosRevisados;
  reanalizado?: Reanalizado;
}
export interface Citas2 {
  [k: string]: Cita;
}
export interface Cita {
  chunk: Chunk;
  pagina: Pagina;
  pagina_impresa?: PaginaImpresa;
  literal: Literal;
  idioma?: Idioma1;
  traduccion?: Traduccion;
  rects?: Rects;
  verificada?: Verificada;
  resaltada?: Resaltada;
}
export interface Rect {
  pagina: Pagina1;
  r: R;
}
