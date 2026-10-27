-- ============================================================
-- Caninos y felinos — Base de datos (Supabase / Postgres)
-- ------------------------------------------------------------
-- CÓMO USARLO:
--   1. Entra a tu proyecto en supabase.com
--   2. Menú lateral:  SQL Editor  >  New query
--   3. Pega TODO este archivo y pulsa "Run".
-- Es seguro ejecutarlo más de una vez (usa "if not exists").
-- ============================================================

-- ---------- Tablas ----------

-- Puntos del cuerpo: catálogo GLOBAL por especie y vista.
-- Se definen una sola vez; cada caso solo cambia qué video suena en cada uno.
create table if not exists puntos (
  id text primary key default 'punto-' || substr(md5(random()::text), 1, 8),
  especie text not null check (especie in ('perro','gato')),
  vista   text not null check (vista in ('ventral','izq','der')),
  nombre  text not null,
  x numeric,
  y numeric
);

-- Casos: un escenario clínico. Solo dice de qué especie es.
-- "activo": si el estudiante lo ve en el menú para simularlo. Puede haber
-- varios casos activos a la vez (antes solo podía haber uno, vía
-- config.caso_activo_id; ver la migración al final de este archivo).
create table if not exists casos (
  id text primary key default 'caso-' || substr(md5(random()::text), 1, 8),
  nombre      text not null,
  descripcion text not null default '',
  especie     text not null check (especie in ('perro','gato')),
  activo      boolean not null default false
);

-- Qué video reproduce cada punto DENTRO de un caso concreto.
-- Si se borra el caso o el punto, sus videos se borran solos (cascade).
create table if not exists caso_videos (
  caso_id  text references casos(id)  on delete cascade,
  punto_id text references puntos(id) on delete cascade,
  video_url text not null,
  primary key (caso_id, punto_id)
);

-- Configuración global: una sola fila, con el caso activo.
create table if not exists config (
  id int primary key default 1,
  caso_activo_id text references casos(id) on delete set null,
  constraint solo_una_fila check (id = 1)
);
insert into config (id, caso_activo_id) values (1, null)
  on conflict (id) do nothing;

-- ---------- Vista pública SIN el nombre del punto ----------
-- El estudiante NUNCA debe recibir el nombre del punto (sería una pista).
-- Por eso la vista solo expone posición y especie/vista, no "nombre".
-- security_invoker=false => la vista lee la tabla como su dueño, así
-- entrega las filas aunque el rol anónimo no pueda leer la tabla "puntos".
create or replace view puntos_publicos
  with (security_invoker = false)
  as select id, especie, vista, x, y from puntos;

grant select on puntos_publicos to anon, authenticated;

-- ---------- Seguridad a nivel de fila (RLS) ----------
-- Activamos RLS en todo. El rol anónimo (el estudiante) solo LEE lo justo.
-- Todas las ESCRITURAS las hace el service_role desde el servidor, que
-- por diseño ignora RLS. El navegador con la clave anon jamás escribe.
alter table puntos      enable row level security;
alter table casos       enable row level security;
alter table caso_videos enable row level security;
alter table config      enable row level security;

-- OJO: NO creamos policy de lectura para "puntos" a propósito: así el
-- rol anónimo no puede leer la columna "nombre". Lee "puntos_publicos".
drop policy if exists "casos lectura publica" on casos;
create policy "casos lectura publica" on casos
  for select to anon, authenticated using (activo = true);

drop policy if exists "caso_videos lectura publica" on caso_videos;
create policy "caso_videos lectura publica" on caso_videos
  for select to anon, authenticated using (true);

drop policy if exists "config lectura publica" on config;
create policy "config lectura publica" on config
  for select to anon, authenticated using (true);

-- ---------- Permisos explícitos para la Data API ----------
-- Concedemos a los roles públicos SOLO lo necesario, para que funcione
-- aunque el proyecto tenga DESACTIVADA la opción de "exponer tablas nuevas
-- automáticamente" (lo recomendado por Supabase). NO damos permiso sobre la
-- tabla "puntos": así el estudiante nunca puede leer la columna "nombre".
grant usage on schema public to anon, authenticated;
grant select on casos       to anon, authenticated;
grant select on caso_videos to anon, authenticated;
grant select on config      to anon, authenticated;

-- El service_role (el servidor / panel de admin) necesita control total.
grant all on puntos, casos, caso_videos, config to service_role;

-- ---------- Tiempo real (Realtime) ----------
-- Para que la vista del estudiante se entere al instante cuando el
-- profesor cambia el caso activo, publicamos la tabla "config".
alter publication supabase_realtime add table config;

-- ---------- Almacenamiento de videos (Storage) ----------
-- Bucket público: cualquiera puede VER los videos (para reproducirlos),
-- pero SUBIR requiere una URL firmada que genera el servidor (admin).
insert into storage.buckets (id, name, public)
values ('videos', 'videos', true)
on conflict (id) do nothing;

-- ============================================================
-- MIGRACIÓN (2026-10-16): varios casos activos a la vez
-- ------------------------------------------------------------
-- Antes solo podía haber UN caso activo (config.caso_activo_id) y el
-- estudiante cargaba directo su maniquí. Ahora cada caso tiene su propio
-- interruptor ("activo"), pueden estar activos varios a la vez, y el
-- estudiante elige en un menú cuál simular.
--
-- Las definiciones de arriba (tabla "casos", su policy y esta sección)
-- ya están al día para un proyecto NUEVO. Si tu base de datos YA EXISTE
-- (la de producción), copia y ejecuta SOLO el bloque de abajo, UNA SOLA
-- VEZ, en el SQL Editor de Supabase — no hace falta pegar todo el archivo:
--
--   alter table casos add column if not exists activo boolean not null default false;
--   update casos set activo = true where id = (select caso_activo_id from config where id = 1);
--   drop policy if exists "casos lectura publica" on casos;
--   create policy "casos lectura publica" on casos
--     for select to anon, authenticated using (activo = true);
--   alter publication supabase_realtime add table casos;
--
-- Es aditiva y segura de ejecutar aunque el código viejo siga desplegado
-- durante el despliegue (sigue filtrando por id, y el caso que estaba
-- activo en config queda con activo=true). "config"/"caso_activo_id"
-- quedan sin uso a partir de ahora, pero no hace falta borrarlos.
-- ============================================================

-- ============================================================
-- MIGRACIÓN (2026-10-26): cuentas por cliente, cupos y solicitudes
-- ============================================================
create table if not exists cuentas (
  id text primary key default 'cuenta-' || substr(md5(random()::text), 1, 8),
  slug text not null unique,
  nombre text not null,
  cupo_casos_propios int not null default 0,
  cupo_storage_mb int not null default 0,
  activa boolean not null default true,
  creada_en timestamptz not null default now()
);

create table if not exists perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  rol text not null check (rol in ('super_admin','cliente')),
  cuenta_id text references cuentas(id) on delete set null
  -- rol='cliente' debe traer cuenta_id; rol='super_admin' lo deja null.
  -- Se valida en código (actions/admin.js), no con un check de SQL, porque
  -- el alta ocurre en 2 pasos (usuario de Auth, luego esta fila).
);

insert into cuentas (id, slug, nombre, cupo_casos_propios, cupo_storage_mb)
values ('cuenta-demo', 'demo', 'EcoSim (demo)', 9999, 9999)
on conflict (id) do nothing;

alter table casos add column if not exists cuenta_id text references cuentas(id);
update casos set cuenta_id = 'cuenta-demo' where cuenta_id is null;
alter table casos alter column cuenta_id set not null;

alter table caso_videos add column if not exists tamano_bytes bigint;

create table if not exists solicitudes_contacto (
  id bigint generated always as identity primary key,
  nombre text not null,
  clinica text,
  correo text not null,
  telefono text,
  mensaje text,
  estado text not null default 'nueva'
    check (estado in ('nueva','contactada','convertida','descartada')),
  creada_en timestamptz not null default now()
);

alter table cuentas enable row level security;
alter table perfiles enable row level security;
alter table solicitudes_contacto enable row level security;
-- Sin policies públicas en estas 3 tablas: solo las toca el servidor con
-- service_role (igual que ya hace admin.js con el resto de tablas).
grant all on cuentas, perfiles, solicitudes_contacto to service_role;

-- Vista pública para resolver "slug -> cuenta" sin exponer cupos ni toda
-- la tabla cuentas al rol anónimo (mismo patrón que puntos_publicos).
create or replace view cuentas_publicas
  with (security_invoker = false)
  as select id, slug, nombre, activa from cuentas;
grant select on cuentas_publicas to anon, authenticated;

-- ============================================================
-- MIGRACIÓN (2026-10-26): lectura pública de casos/caso_videos solo por
-- función (cierra la lectura directa por REST, que no filtraba por cuenta)
-- ------------------------------------------------------------
create or replace function casos_activos_de_cuenta(p_cuenta_id text)
returns table (id text, nombre text, descripcion text, especie text)
language sql security definer set search_path = public
as $$
  select c.id, c.nombre, c.descripcion, c.especie
  from casos c
  join cuentas cu on cu.id = c.cuenta_id
  where c.cuenta_id = p_cuenta_id and cu.activa and c.activo
  order by c.nombre;
$$;
grant execute on function casos_activos_de_cuenta(text) to anon, authenticated;

create or replace function caso_publico(p_cuenta_id text, p_caso_id text)
returns table (id text, nombre text, especie text)
language sql security definer set search_path = public
as $$
  select c.id, c.nombre, c.especie
  from casos c
  join cuentas cu on cu.id = c.cuenta_id
  where c.cuenta_id = p_cuenta_id and cu.activa and c.activo and c.id = p_caso_id;
$$;
grant execute on function caso_publico(text, text) to anon, authenticated;

create or replace function videos_de_caso_publico(p_cuenta_id text, p_caso_id text)
returns table (punto_id text, video_url text)
language sql security definer set search_path = public
as $$
  select cv.punto_id, cv.video_url
  from caso_videos cv
  join casos c on c.id = cv.caso_id
  join cuentas cu on cu.id = c.cuenta_id
  where c.cuenta_id = p_cuenta_id and c.id = p_caso_id and c.activo and cu.activa;
$$;
grant execute on function videos_de_caso_publico(text, text) to anon, authenticated;

-- Esto es lo que de verdad cierra el hueco: antes, cualquiera con la clave
-- anon podía pedir TODOS los casos de TODAS las cuentas por `/rest/v1/casos`
-- directo. Ahora solo se puede pedir "los de esta cuenta" vía las funciones
-- de arriba. puntos_publicos y cuentas_publicas NO cambian (sin dato
-- sensible por cuenta en ninguna de las dos).
drop policy if exists "casos lectura publica" on casos;
drop policy if exists "caso_videos lectura publica" on caso_videos;
revoke select on casos from anon, authenticated;
revoke select on caso_videos from anon, authenticated;

-- ============================================================
-- MIGRACIÓN (2026-10-26): cerrar "cuentas_publicas"
-- ------------------------------------------------------------
-- La vista "cuentas_publicas" (creada arriba, en la migración de cuentas)
-- devolvía TODAS las cuentas (id, slug, nombre, activa) a cualquiera con
-- la clave anon — cómodo para enumerar el listado completo de clientes
-- del negocio desde afuera. resolverCuenta (src/lib/datos.js) solo
-- necesita UNA cuenta por su slug, así que la reemplazamos por una
-- función que devuelve justo eso.
-- ------------------------------------------------------------
create or replace function cuenta_por_slug(p_slug text)
returns table (id text, slug text, nombre text, activa boolean)
language sql security definer set search_path = public
as $$
  select id, slug, nombre, activa from cuentas where slug = p_slug;
$$;
grant execute on function cuenta_por_slug(text) to anon, authenticated;

-- Al borrar la vista se van también sus permisos (el "grant select on
-- cuentas_publicas" de arriba) — no hace falta un revoke aparte.
drop view if exists cuentas_publicas;
