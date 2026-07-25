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
create table if not exists casos (
  id text primary key default 'caso-' || substr(md5(random()::text), 1, 8),
  nombre      text not null,
  descripcion text not null default '',
  especie     text not null check (especie in ('perro','gato'))
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
  for select to anon, authenticated using (true);

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
