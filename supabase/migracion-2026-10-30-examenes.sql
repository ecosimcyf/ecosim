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
