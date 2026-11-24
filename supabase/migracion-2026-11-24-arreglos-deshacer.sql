-- ============================================================
-- DESHACER migracion-2026-11-24-arreglos.sql
-- ------------------------------------------------------------
-- Quita las funciones y comprobaciones nuevas. El código vuelve solo al
-- comportamiento anterior (no necesita las funciones). No devuelve permisos
-- a anon/authenticated (nunca los tuvieron) ni reabre las funciones viejas.
-- ============================================================
drop function if exists consumir_intento(text, int, int);
drop function if exists reservar_subida(text, text, text, bigint, bigint, int);
drop function if exists crear_caso_con_cupo(text, text, text, int);
alter table if exists perfiles drop constraint if exists perfiles_cliente_con_cuenta_chk;
alter table if exists casos drop constraint if exists casos_laboratorio_array_chk;
alter table if exists casos drop constraint if exists casos_vitales_objeto_chk;