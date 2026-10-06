-- VotoClaro · esquema del chat (plan técnico D7, D14). Solo índices de búsqueda y contadores:
-- NUNCA se guarda el texto de las preguntas (constitución VI.2).
create extension if not exists vector;

-- Texto completo de los programas, por fragmentos con cabecera contextual
create table if not exists fragmentos (
  id        text primary key,          -- id del chunk (p. ej. pp-23-p047-02)
  conv      text not null,
  cand      text not null,
  pagina    int  not null,
  etiqueta  text,
  seccion   text not null default '',
  texto     text not null,
  contexto  text not null,
  rect      jsonb,                     -- caja del fragmento normalizada 0..1 (para resaltar)
  busqueda  tsvector not null,
  embedding vector(1536),
  hash      text not null
);
create index if not exists fragmentos_busqueda on fragmentos using gin (busqueda);
create index if not exists fragmentos_conv_cand on fragmentos (conv, cand);
create index if not exists fragmentos_embedding on fragmentos using hnsw (embedding vector_cosine_ops);

-- Propuestas y frases de resumen ya verificadas (índice curado)
create table if not exists propuestas (
  id        text primary key,          -- conv:cand:tema:item
  conv      text not null,
  cand      text not null,
  tema      text not null,
  subtema   text not null default '',
  tipo      text not null,             -- propuesta | resumen
  texto     text not null,
  contexto  text not null,
  citas     jsonb not null,            -- [{cid, pagina, pagina_impresa}]
  busqueda  tsvector not null,
  embedding vector(1536),
  hash      text not null
);
create index if not exists propuestas_busqueda on propuestas using gin (busqueda);
create index if not exists propuestas_conv_cand on propuestas (conv, cand);
create index if not exists propuestas_embedding on propuestas using hnsw (embedding vector_cosine_ops);

-- Límites de uso por persona anónima (clave = HMAC de la IP con sal diaria)
create table if not exists limites (
  clave    text not null,
  ventana  text not null,
  contador int  not null default 0,
  creado   timestamptz not null default now(),
  primary key (clave, ventana)
);

-- Métricas agregadas de uso y coste (sin contenido)
create table if not exists uso_diario (
  fecha          date primary key,
  preguntas      int    not null default 0,
  tokens_entrada bigint not null default 0,
  tokens_salida  bigint not null default 0,
  coste_usd      numeric(10, 4) not null default 0
);
