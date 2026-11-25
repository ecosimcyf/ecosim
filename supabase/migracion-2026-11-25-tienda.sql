-- ============================================================
-- MIGRACIÓN (2026-11-25): tienda de casos
-- ------------------------------------------------------------
-- Pégala UNA vez en Supabase → SQL Editor → New query → Run, DESPUÉS de
-- desplegar la versión nueva. Es segura de re-ejecutar. Para deshacerla:
-- migracion-2026-11-25-tienda-deshacer.sql
--
-- Hasta que la ejecutes, el código sigue funcionando (detecta que faltan
-- las tablas y la tienda simplemente no aparece). Requiere haber ejecutado
-- antes migracion-2026-11-24-arreglos.sql.
--
-- Qué hace:
--  1. Cuenta técnica «catalogo» (inactiva: no entran estudiantes). Ahí el
--     super_admin crea y edita los casos que se venden.
--  2. casos.origen_catalogo_id: marca los casos que una clínica COMPRÓ.
--  3. catalogo_casos: qué casos de la cuenta «catalogo» se ofrecen, con su
--     descripción de venta y un precio de REFERENCIA por moneda (solo lo ve
--     el super_admin: la clínica nunca ve precios).
--  4. adquisiciones: solicitud -> pago (por fuera) -> entrega de cada compra.
--  5. reclamar_entrega: toma una entrega de forma atómica (evita entregar
--     dos veces).
--  6. uso_de_cuentas y crear_caso_con_cupo: los casos comprados NO cuentan
--     contra el cupo de casos propios y sus archivos compartidos NO cuentan
--     contra el cupo de almacenamiento (no se copian: apuntan a los mismos
--     objetos de Storage que el caso del catálogo).
-- ============================================================

-- ---------- 1. Cuenta técnica del catálogo ----------
-- activa = false: la vista de estudiantes (/c/catalogo) no abre. Cupos
-- altos porque ahí solo escribe el super_admin (que de todos modos no tiene
-- cupo). El idioma queda en el valor por defecto de la columna.
insert into cuentas (id, slug, nombre, cupo_casos_propios, cupo_storage_mb, activa)
values ('cuenta-catalogo', 'catalogo', 'Catálogo de casos (cuenta técnica)', 9999, 99999, false)
on conflict do nothing;

-- ---------- 2. Origen de los casos comprados ----------
-- Sin FK a propósito: catalogo_casos ya apunta a casos y una FK de vuelta
-- haría circular el respaldo/restauración. Lo protege el código.
alter table casos add column if not exists origen_catalogo_id text;
-- Una clínica no puede tener dos copias del mismo caso del catálogo
-- (red de seguridad contra una entrega doble).
create unique index if not exists casos_origen_unico_idx
  on casos (cuenta_id, origen_catalogo_id) where origen_catalogo_id is not null;

-- ---------- 3. Catálogo ----------
create table if not exists catalogo_casos (
  id text primary key default 'cat-' || substr(md5(random()::text), 1, 8),
  -- on delete restrict: no se puede borrar un caso que está en el catálogo.
  caso_origen_id text not null unique references casos(id) on delete restrict,
  titulo text not null check (char_length(titulo) between 1 and 120),
  descripcion_venta text not null default '' check (char_length(descripcion_venta) <= 2000),
  especie text not null check (especie in ('perro','gato')),
  -- Precio de REFERENCIA por moneda (solo lo ve el super_admin). La moneda que
  -- aplica a una cuenta sale de cuentas.idioma: es=COP, pt=BRL, en=USD.
  precio_cop numeric(14,2) check (precio_cop is null or precio_cop >= 0),
  precio_brl numeric(14,2) check (precio_brl is null or precio_brl >= 0),
  precio_usd numeric(14,2) check (precio_usd is null or precio_usd >= 0),
  portada_url text check (portada_url is null or char_length(portada_url) <= 1000),
  nivel text check (nivel is null or nivel in ('basico','intermedio','avanzado')),
  etiquetas text[] not null default '{}',
  publicado boolean not null default false,
  orden int not null default 0,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index if not exists catalogo_casos_orden_idx on catalogo_casos (publicado, orden);

-- ---------- 4. Adquisiciones ----------
create table if not exists adquisiciones (
  id text primary key default 'adq-' || substr(md5(random()::text), 1, 10),
  cuenta_id text not null references cuentas(id) on delete cascade,
  catalogo_id text not null references catalogo_casos(id) on delete restrict,
  estado text not null default 'solicitada'
    check (estado in ('solicitada','pagada','entregando','entregada','cancelada','fallida')),
  -- Moneda y precio de referencia CONGELADOS al solicitar (el precio puede
  -- ser null si no se había puesto uno para esa moneda).
  moneda text not null check (moneda in ('COP','BRL','USD')),
  precio_referencia numeric(14,2),
  caso_entregado_id text references casos(id) on delete set null,
  nota text not null default '' check (char_length(nota) <= 1000),
  -- Para una futura pasarela de pago (hoy se cobra por fuera): sin usar.
  pasarela text,
  referencia_pago text,
  solicitada_en timestamptz not null default now(),
  pagada_en timestamptz,
  entregada_en timestamptz,
  actualizada_en timestamptz not null default now(),
  solicitada_por uuid
);
-- Una sola adquisición VIVA por (cuenta, caso del catálogo).
create unique index if not exists adquisiciones_viva_unica_idx
  on adquisiciones (cuenta_id, catalogo_id)
  where estado in ('solicitada','pagada','entregando','entregada');
create index if not exists adquisiciones_cuenta_idx on adquisiciones (cuenta_id, solicitada_en desc);

-- Solo el servidor (service_role) toca estas tablas; el navegador nunca.
alter table catalogo_casos enable row level security;
alter table adquisiciones enable row level security;
revoke all on catalogo_casos from anon, authenticated;
revoke all on adquisiciones from anon, authenticated;
grant select, insert, update, delete on catalogo_casos to service_role;
grant select, insert, update, delete on adquisiciones to service_role;

-- ---------- 5. Reclamar una entrega (atómico) ----------
-- Pasa la adquisición a 'entregando' SOLO si estaba en 'solicitada', 'pagada'
-- o 'fallida' (reintento), o si se quedó en 'entregando' más de 10 minutos
-- (el servidor murió a mitad). Devuelve la fila, o ninguna si otro ya la
-- tomó / ya se entregó: así dos clics a la vez nunca entregan dos veces.
create or replace function reclamar_entrega(p_adq text)
returns setof adquisiciones
language sql security definer set search_path = public, pg_temp
as $$
  update adquisiciones a
     set estado = 'entregando', actualizada_en = now()
   where a.id = p_adq
     and (a.estado in ('solicitada', 'pagada', 'fallida')
          or (a.estado = 'entregando' and a.actualizada_en < now() - interval '10 minutes'))
  returning a.*;
$$;
revoke execute on function reclamar_entrega(text) from public, anon, authenticated;
grant execute on function reclamar_entrega(text) to service_role;

-- ---------- 6. Cupos: lo comprado no cuenta ----------
-- Un video o archivo de un caso comprado que sigue apuntando a un objeto
-- FUERA del prefijo de la cuenta (o sea, al de la cuenta «catalogo») no
-- cuenta como suyo. Si la clínica sube uno propio (queda bajo su prefijo),
-- ese sí cuenta. Los casos comprados tampoco cuentan como casos propios.
create or replace function uso_de_cuentas(p_cuenta_id text default null)
returns table (cuenta_id text, casos int, bytes bigint)
language sql stable security definer set search_path = public, pg_temp
as $$
  select cu.id,
    (select count(*)::int from casos c where c.cuenta_id = cu.id and c.origen_catalogo_id is null),
    (coalesce((select sum(v.tamano_bytes) from caso_videos v join casos c on c.id = v.caso_id
               where c.cuenta_id = cu.id
                 and (c.origen_catalogo_id is null
                      or strpos(v.video_url, '/storage/v1/object/public/videos/' || cu.id || '/') > 0)), 0)
     + coalesce((select sum(a.tamano_bytes) from caso_archivos a join casos c on c.id = a.caso_id
                 where c.cuenta_id = cu.id
                   and (c.origen_catalogo_id is null or left(a.path, length(cu.id) + 1) = cu.id || '/')), 0)
     + coalesce((select sum(s.tamano_bytes) from subidas_pendientes s
                 where s.cuenta_id = cu.id and s.creada_en > now() - interval '24 hours'), 0))::bigint
  from cuentas cu
  where p_cuenta_id is null or cu.id = p_cuenta_id;
$$;
revoke execute on function uso_de_cuentas(text) from public, anon, authenticated;
grant execute on function uso_de_cuentas(text) to service_role;

create or replace function crear_caso_con_cupo(p_cuenta text, p_nombre text, p_especie text, p_cupo int)
returns text
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_casos int;
  v_hay_activo boolean;
begin
  perform pg_advisory_xact_lock(hashtext(p_cuenta));
  if p_cupo is not null then
    select count(*) into v_casos from casos c
     where c.cuenta_id = p_cuenta and c.origen_catalogo_id is null;
    if v_casos >= p_cupo then return 'cupo'; end if;
  end if;
  select exists (select 1 from casos c where c.cuenta_id = p_cuenta and c.activo) into v_hay_activo;
  insert into casos (nombre, especie, cuenta_id, activo)
  values (p_nombre, p_especie, p_cuenta, not v_hay_activo);
  return 'ok';
end;
$$;
revoke execute on function crear_caso_con_cupo(text, text, text, int) from public, anon, authenticated;
grant execute on function crear_caso_con_cupo(text, text, text, int) to service_role;
