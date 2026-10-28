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
