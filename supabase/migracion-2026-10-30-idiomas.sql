-- ============================================================
-- MIGRACIÓN (2026-10-30): idioma de cada cuenta
-- ------------------------------------------------------------
-- La app ahora está en español, portugués e inglés. Cada cuenta tiene un
-- idioma (por defecto español): es el del panel de su administrador y el
-- con que abre la vista de sus estudiantes (cada estudiante puede
-- cambiarlo para sí mismo).
--
-- SOLO AGREGA cosas (una columna y una función): la versión publicada
-- (main) sigue funcionando igual aunque esto se ejecute antes, y la rama
-- nueva también funciona sin esto (todas las cuentas en español).
--
-- Pégala UNA vez en Supabase → SQL Editor → New query → Run.
-- Es segura de re-ejecutar. Para deshacerla: migracion-2026-10-30-idiomas-deshacer.sql
-- ============================================================

alter table cuentas add column if not exists idioma text not null default 'es';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'cuentas_idioma_check') then
    alter table cuentas add constraint cuentas_idioma_check check (idioma in ('es','pt','en'));
  end if;
end $$;

-- Idioma con que abre la vista del estudiante (solo de cuentas activas).
create or replace function idioma_de_cuenta(p_cuenta_id text)
returns text
language sql security definer set search_path = public
as $$
  select idioma from cuentas where id = p_cuenta_id and activa;
$$;
grant execute on function idioma_de_cuenta(text) to anon, authenticated;
