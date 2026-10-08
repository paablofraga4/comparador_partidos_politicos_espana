-- VotoClaro · apoyos (spec 005, plan técnico D17).
-- Sin emails, IPs ni ids de cliente o de suscripción de Stripe: cada apoyo se reconoce por su id,
-- que viaja en los metadatos del pago (constitución VI).

create table if not exists apoyos (
  id           text primary key,
  tipo         text not null check (tipo in ('mensual', 'puntual')),
  importe_cent int  not null check (importe_cent > 0),
  nombre       text,                               -- solo si la persona lo escribe y pasa el filtro
  estado       text not null default 'pendiente',  -- pendiente | activo | cancelado
  sesion       text unique,                        -- sesión de pago (para confirmarla)
  creado       timestamptz not null default now(),
  activado     timestamptz
);

-- Cada cobro: la factura de cada mes (mensual) o el pago único (puntual). Registrar el mismo
-- cobro dos veces (vuelta del pago y webhook) no lo duplica.
create table if not exists apoyo_cobros (
  id           text primary key,                   -- factura o PaymentIntent
  apoyo        text not null references apoyos (id),
  importe_cent int  not null,
  pago         text,                               -- PaymentIntent, para las devoluciones
  cobrado      timestamptz not null default now(),
  devuelto     boolean not null default false
);
create index if not exists apoyo_cobros_pago on apoyo_cobros (pago);
create index if not exists apoyo_cobros_apoyo on apoyo_cobros (apoyo);
