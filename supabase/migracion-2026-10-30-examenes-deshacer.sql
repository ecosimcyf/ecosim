-- ============================================================
-- DESHACER la migración del 2026-10-30 (exámenes complementarios)
-- ------------------------------------------------------------
-- Borra TODO lo que agregó migracion-2026-10-30-examenes.sql y los
-- exámenes que se hayan cargado. No toca casos, videos, puntos ni cuentas.
--
-- ANTES de ejecutarla: en Supabase → Storage → "examenes", selecciona
-- todos los archivos (y carpetas) y bórralos. Supabase no deja borrar un
-- bucket con archivos dentro desde el SQL.
-- ============================================================

drop function if exists resumen_examenes_de_cuenta(text);
drop function if exists examenes_de_caso_publico(text, text);
drop table if exists caso_archivos;
alter table casos drop column if exists laboratorio;
alter table casos drop column if exists vitales;
delete from storage.buckets where id = 'examenes';
