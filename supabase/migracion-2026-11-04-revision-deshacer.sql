-- ============================================================
-- DESHACER migracion-2026-11-04-revision.sql
-- ------------------------------------------------------------
-- Solo si hay que volver atrás. Borra el código de acceso de todas las
-- cuentas, el registro de errores y los contadores de intentos.
-- Si ya ejecutaste migracion-2026-11-04-cerrar-funciones-viejas.sql,
-- ejecuta antes su sección «Para deshacer» (o main dejará de funcionar).
-- ============================================================
drop function if exists datos_caso_v2(text, text, text);
drop function if exists casos_activos_v2(text, text);
drop function if exists cuenta_por_slug_v2(text);
drop function if exists acceso_cuenta(text, text);
drop function if exists intento_bloqueado(text, int, int);
drop function if exists registrar_intento(text, int);
drop function if exists uso_de_cuentas(text);
drop table if exists intentos;
drop table if exists subidas_pendientes;
drop table if exists errores;
alter table cuentas drop column if exists codigo_hash;
alter table cuentas drop column if exists token_acceso;
