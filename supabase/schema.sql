-- ============================================================
-- Caninos y felinos — Base de datos (Supabase / Postgres)
-- ------------------------------------------------------------
-- CÓMO USARLO:
--   1. Entra a tu proyecto en supabase.com
--   2. Menú lateral:  SQL Editor  >  New query
--   3. Pega TODO este archivo y pulsa "Run".
-- Es seguro ejecutarlo más de una vez (usa "if not exists" y bloques que
-- comprueban antes de cambiar).
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
-- (Ya no se usa: la migración 2026-10-28 la vuelve a quitar. El bloque
-- solo evita el error "ya es miembro" al re-ejecutar este archivo.)
do $$ begin
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'config') then
    alter publication supabase_realtime add table config;
  end if;
end $$;

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

-- ============================================================
-- MIGRACIÓN (2026-10-28): los puntos del maniquí dejan de ser un
-- catálogo global y pasan a ser propios de cada cuenta
-- ------------------------------------------------------------
-- Antes "puntos" no tenía cuenta_id: un solo catálogo compartido por
-- TODAS las cuentas, que solo el super_admin podía tocar. Ahora cada
-- cliente tiene control total sobre SUS propios puntos (mismo modelo
-- que ya usa "casos"); lo único que sigue limitado es el storage
-- (cupo_storage_mb), que es lo único que cuesta dinero de verdad.
--
-- Los puntos que ya existían (el catálogo compartido de antes) quedan
-- asignados a la cuenta demo — igual que hizo la migración de "casos"
-- de arriba con los casos que ya existían. Cualquier otra cuenta que
-- ya tuviera puntos (p. ej. de pruebas) arranca vacía: el cliente los
-- vuelve a crear a su gusto.
-- ------------------------------------------------------------
alter table puntos add column if not exists cuenta_id text references cuentas(id);
update puntos set cuenta_id = 'cuenta-demo' where cuenta_id is null;
alter table puntos alter column cuenta_id set not null;

-- La vista "puntos_publicos" (arriba) ya no es segura de usar tal cual:
-- no filtraba por cuenta, así que el estudiante de una clínica vería
-- también los puntos (posición) de las demás. La reemplazamos por una
-- función como videos_de_caso_publico, que sí filtra por cuenta.
create or replace function puntos_publicos_de_cuenta(p_cuenta_id text, p_especie text)
returns table (id text, vista text, x numeric, y numeric)
language sql security definer set search_path = public
as $$
  select id, vista, x, y from puntos
  where cuenta_id = p_cuenta_id and especie = p_especie;
$$;
grant execute on function puntos_publicos_de_cuenta(text, text) to anon, authenticated;

-- Al borrar la vista se van también sus permisos (el "grant select on
-- puntos_publicos" de arriba) — no hace falta un revoke aparte.
drop view if exists puntos_publicos;

-- ============================================================
-- MIGRACIÓN (2026-10-28): revisión completa
-- ------------------------------------------------------------
-- Pégala UNA vez en Supabase → SQL Editor → New query → Run.
-- Es segura de re-ejecutar. (También está al final de schema.sql.)
-- ============================================================

-- 1. Límites del bucket de videos: máximo 50 MB por archivo y solo MP4.
--    Antes aceptaba archivos de cualquier tamaño y tipo (incluso HTML).
--    El panel ya convierte todo a MP4/H.264 antes de subir.
update storage.buckets
   set file_size_limit = 52428800,
       allowed_mime_types = array['video/mp4']
 where id = 'videos';

-- 2. La tabla "config" quedó sin uso (desde que puede haber varios casos
--    activos) pero el rol anónimo todavía podía leerla. Se cierra.
drop policy if exists "config lectura publica" on config;
revoke select on config from anon, authenticated;
do $$ begin
  if exists (select 1 from pg_publication_tables
             where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'config') then
    alter publication supabase_realtime drop table config;
  end if;
  -- "casos" también se publicó en Realtime, pero la vista del estudiante ya
  -- no lo usa (refresca por sondeo): se quita.
  if exists (select 1 from pg_publication_tables
             where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'casos') then
    alter publication supabase_realtime drop table casos;
  end if;
end $$;

-- 3. Formulario de contacto: cuándo autorizó la persona el tratamiento de
--    sus datos (Ley 1581 de 2012) y topes de longitud por si alguien
--    llama a la acción saltándose el formulario.
alter table solicitudes_contacto add column if not exists autorizo_datos_en timestamptz;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'solicitudes_largos') then
    alter table solicitudes_contacto add constraint solicitudes_largos check (
      char_length(nombre) <= 100 and char_length(coalesce(clinica, '')) <= 150 and
      char_length(correo) <= 200 and char_length(coalesce(telefono, '')) <= 40 and
      char_length(coalesce(mensaje, '')) <= 2000) not valid;
  end if;
end $$;

-- 4. Índices para las consultas por cuenta (casos, puntos) y por punto
--    (caso_videos): sin ellos, cada consulta recorre la tabla entera.
create index if not exists casos_cuenta_idx on casos (cuenta_id);
create index if not exists puntos_cuenta_especie_idx on puntos (cuenta_id, especie);
create index if not exists caso_videos_punto_idx on caso_videos (punto_id);
create index if not exists perfiles_cuenta_idx on perfiles (cuenta_id);

-- 5. Los puntos del maniquí de una cuenta DESACTIVADA ya no se entregan
--    (las demás funciones públicas ya exigían cuenta activa).
create or replace function puntos_publicos_de_cuenta(p_cuenta_id text, p_especie text)
returns table (id text, vista text, x numeric, y numeric)
language sql security definer set search_path = public
as $$
  select p.id, p.vista, p.x, p.y from puntos p
  join cuentas cu on cu.id = p.cuenta_id
  where p.cuenta_id = p_cuenta_id and p.especie = p_especie and cu.activa;
$$;
grant execute on function puntos_publicos_de_cuenta(text, text) to anon, authenticated;

-- ============================================================
-- MIGRACIÓN (2026-10-30): exámenes complementarios por caso
-- ------------------------------------------------------------
-- Cada caso puede traer, además de los videos de ecografía:
--   · Laboratorio  → casos.laboratorio (tablas de valores) + adjuntos
--   · Radiografías → imágenes en caso_archivos (tipo 'rx')
--   · Signos vitales → casos.vitales (lo que muestra el "monitor")
--
-- SOLO AGREGA cosas (columnas, una tabla, un bucket y dos funciones):
-- no cambia ni borra nada de lo que ya existe, así que la versión
-- publicada (main) sigue funcionando igual aunque esto se ejecute antes.
--
-- Pégala UNA vez en Supabase → SQL Editor → New query → Run.
-- Es segura de re-ejecutar. Para deshacerla: migracion-2026-10-30-examenes-deshacer.sql
-- ============================================================

-- 1. Laboratorio y signos vitales del caso (los arma y valida el panel).
alter table casos add column if not exists laboratorio jsonb not null default '[]'::jsonb;
alter table casos add column if not exists vitales     jsonb not null default '{}'::jsonb;

-- 2. Archivos de exámenes: radiografías ('rx') y adjuntos del
--    laboratorio ('lab', foto o PDF del reporte). Se borran solos si se
--    borra el caso (cascade); los archivos de Storage los borra el panel.
create table if not exists caso_archivos (
  id text primary key default 'arch-' || substr(md5(random()::text), 1, 10),
  caso_id text not null references casos(id) on delete cascade,
  tipo text not null check (tipo in ('rx','lab')),
  path text not null,
  url text not null,
  titulo text not null default '' check (char_length(titulo) <= 120),
  mime text not null,
  tamano_bytes bigint not null default 0,
  orden int not null default 0,
  creado_en timestamptz not null default now()
);
create index if not exists caso_archivos_caso_idx on caso_archivos (caso_id, tipo, orden);

-- Solo el servidor (service_role) lee y escribe la tabla; el estudiante
-- la lee por la función de abajo, filtrada por cuenta.
alter table caso_archivos enable row level security;
revoke all on caso_archivos from anon, authenticated;
-- En este proyecto las tablas nuevas NO heredan permisos para el servidor:
-- sin esto el panel falla con "permission denied for table caso_archivos".
grant select, insert, update, delete on caso_archivos to service_role;

-- 3. Bucket público (como "videos"): cualquiera con el enlace VE la
--    imagen, pero SUBIR requiere una URL firmada del servidor.
--    Máximo 10 MB, solo imágenes y PDF.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('examenes', 'examenes', true, 10485760,
        array['image/webp','image/jpeg','image/png','application/pdf'])
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 4. Lo que ve el estudiante de UN caso (mismas condiciones que sus
--    videos: el caso es de esa cuenta y ambos están activos).
create or replace function examenes_de_caso_publico(p_cuenta_id text, p_caso_id text)
returns table (laboratorio jsonb, vitales jsonb, archivos jsonb)
language sql security definer set search_path = public
as $$
  select c.laboratorio, c.vitales,
         coalesce((select jsonb_agg(jsonb_build_object(
                     'id', a.id, 'tipo', a.tipo, 'titulo', a.titulo, 'url', a.url, 'mime', a.mime)
                     order by a.tipo, a.orden, a.creado_en)
                   from caso_archivos a where a.caso_id = c.id), '[]'::jsonb)
  from casos c
  join cuentas cu on cu.id = c.cuenta_id
  where c.cuenta_id = p_cuenta_id and c.id = p_caso_id and c.activo and cu.activa;
$$;
grant execute on function examenes_de_caso_publico(text, text) to anon, authenticated;

-- 5. Para los íconos del menú de casos: qué exámenes trae cada caso
--    activo de la cuenta (sin el contenido).
create or replace function resumen_examenes_de_cuenta(p_cuenta_id text)
returns table (caso_id text, lab boolean, rx boolean, vitales boolean)
language sql security definer set search_path = public
as $$
  select c.id,
         jsonb_array_length(c.laboratorio) > 0
           or exists (select 1 from caso_archivos a where a.caso_id = c.id and a.tipo = 'lab'),
         exists (select 1 from caso_archivos a where a.caso_id = c.id and a.tipo = 'rx'),
         c.vitales <> '{}'::jsonb
  from casos c
  join cuentas cu on cu.id = c.cuenta_id
  where c.cuenta_id = p_cuenta_id and c.activo and cu.activa;
$$;
grant execute on function resumen_examenes_de_cuenta(text) to anon, authenticated;
