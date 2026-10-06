-- VotoClaro · cupo gratis y bonos (spec 004, plan técnico D16).
-- Sin emails, sin nombres, sin IPs en claro y sin el texto de las preguntas (constitución VI).

-- Preguntas gratis por navegador. clave = sha256 de la cookie técnica aleatoria «vc_uso»
create table if not exists uso_gratis (
  clave   text primary key,
  usadas  int  not null default 0,
  creado  timestamptz not null default now()
);

-- Bonos anónimos. Solo se guarda el hash del código; el pago lo procesa la pasarela
create table if not exists bonos (
  id          text primary key,
  codigo_hash text not null unique,
  plan        text not null,
  total       int  not null,
  usadas      int  not null default 0,
  por_hora    int  not null,
  estado      text not null default 'pendiente',  -- pendiente | activo | anulado
  sesion      text unique,                        -- sesión de pago (para confirmarla)
  pago        text,                               -- id del pago (para devoluciones)
  creado      timestamptz not null default now(),
  activado    timestamptz,
  caduca      timestamptz not null
);
create index if not exists bonos_pago on bonos (pago);

-- El gasto diario se separa en gratis y pago (cada uno con su tope)
alter table uso_diario add column if not exists tipo text not null default 'gratis';
alter table uso_diario drop constraint if exists uso_diario_pkey;
alter table uso_diario add primary key (fecha, tipo);
