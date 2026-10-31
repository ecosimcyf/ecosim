-- Deshace migracion-2026-10-30-idiomas.sql: todas las cuentas vuelven a
-- quedar sin idioma (la app las muestra en español).
drop function if exists idioma_de_cuenta(text);
alter table cuentas drop constraint if exists cuentas_idioma_check;
alter table cuentas drop column if exists idioma;
