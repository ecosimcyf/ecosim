-- ============================================================
-- MIGRACIÓN (2026-11-24): arreglos de la revisión de noviembre
-- ------------------------------------------------------------
-- Pégala UNA vez en Supabase → SQL Editor → New query → Run, DESPUÉS de
-- desplegar la versión nueva. Es segura de re-ejecutar. Para deshacerla:
-- migracion-2026-11-24-arreglos-deshacer.sql
--
-- Hasta que la ejecutes, el código sigue funcionando con el comportamiento
-- anterior (detecta que faltan las funciones y no las usa). Requiere haber
-- ejecutado antes migracion-2026-11-04-revision.sql.
--
-- Qué hace:
--  1. consumir_intento: límite de intentos ATÓMICO (login, cambio de clave,
--     contacto): registra el intento y dice si ya se pasó, en un solo paso.
--  2. reservar_subida: reserva de cupo de subidas con candado por cuenta
--     (dos subidas a la vez ya no se saltan el cupo) y tope de pendientes.
--  3. crear_caso_con_cupo: crear un caso respetando el cupo, con candado por
--     cuenta (dos clics a la vez ya no pasan el cupo).
--  4. Permisos: se quita TODO permiso de anon/authenticated sobre las tablas
--     internas (solo el servidor con service_role las toca) y se fija el
--     search_path de las funciones de la migración anterior.
--  5. Comprobaciones (checks) "not valid": solo se exigen a filas nuevas o
--     modificadas, no revisan lo ya guardado (no pueden fallar por datos viejos).
--  6. Cierra las funciones públicas viejas (si no lo habías hecho).
-- ============================================================

-- ---------- 1. Límite de intentos atómico ----------
-- Suma un intento a "p_clave" y devuelve true si YA SE PASÓ de p_max en la
-- ventana (el intento número p_max + 1 es el primero bloqueado). Un único
-- INSERT ... ON CONFLICT: dos peticiones simultáneas no se pisan.
create or replace function consumir_intento(p_clave text, p_max int, p_ventana_seg int)
returns boolean
language sql security definer set search_path = public, pg_temp
as $$
  insert into intentos as i (clave, conteo, desde) values (p_clave, 1, now())
  on conflict (clave) do update set
    conteo = case when i.desde <= now() - make_interval(secs => p_ventana_seg) then 1 else i.conteo + 1 end,
    desde  = case when i.desde <= now() - make_interval(secs => p_ventana_seg) then now() else i.desde end
  returning conteo > p_max;
$$;
revoke execute on function consumir_intento(text, int, int) from public, anon, authenticated;
grant execute on function consumir_intento(text, int, int) to service_role;

-- ---------- 2. Reserva de subidas con candado por cuenta ----------
-- Devuelve 'ok' (reservado), 'cupo' (no cabe en el cupo; p_cupo_bytes null =
-- sin cupo, para el super_admin) o 'pendientes' (la cuenta ya tiene
-- p_max_pendientes subidas sin guardar en las últimas 24 h).
-- pg_advisory_xact_lock serializa las reservas de UNA cuenta (el candado se
-- suelta solo al terminar la transacción); uso_de_cuentas ya suma videos,
-- exámenes y las reservas vigentes.
create or replace function reservar_subida(
  p_cuenta text, p_bucket text, p_path text, p_bytes bigint, p_cupo_bytes bigint, p_max_pendientes int)
returns text
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_uso bigint;
  v_pendientes int;
begin
  perform pg_advisory_xact_lock(hashtext(p_cuenta));

  select count(*) into v_pendientes from subidas_pendientes s
   where s.cuenta_id = p_cuenta and s.creada_en > now() - interval '24 hours';
  if v_pendientes >= p_max_pendientes then return 'pendientes'; end if;

  if p_cupo_bytes is not null then
    select u.bytes into v_uso from uso_de_cuentas(p_cuenta) u;
    if coalesce(v_uso, 0) + p_bytes > p_cupo_bytes then return 'cupo'; end if;
  end if;

  insert into subidas_pendientes (bucket, path, cuenta_id, tamano_bytes)
  values (p_bucket, p_path, p_cuenta, p_bytes)
  on conflict (bucket, path) do nothing;
  return 'ok';
end;
$$;
revoke execute on function reservar_subida(text, text, text, bigint, bigint, int) from public, anon, authenticated;
grant execute on function reservar_subida(text, text, text, bigint, bigint, int) to service_role;

-- ---------- 3. Crear un caso respetando el cupo ----------
-- 'ok' o 'cupo' (p_cupo null = sin tope). El caso nace activo si la cuenta
-- no tenía ninguno activo. Mismo candado por cuenta que reservar_subida.
create or replace function crear_caso_con_cupo(p_cuenta text, p_nombre text, p_especie text, p_cupo int)
returns text
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_casos int;
  v_hay_activo boolean;
begin
  perform pg_advisory_xact_lock(hashtext(p_cuenta));
  if p_cupo is not null then
    select count(*) into v_casos from casos c where c.cuenta_id = p_cuenta;
    if v_casos >= p_cupo then return 'cupo'; end if;
  end if;
  select exists (select 1 from casos c where c.cuenta_id = p_cuenta and c.activo) into v_hay_activo;
  insert into casos (nombre, especie, cuenta_id, activo)
  values (p_nombre, p_especie, p_cuenta, not v_hay_activo);
  return 'ok';
end;
$$;
revoke execute on function crear_caso_con_cupo(text, text, text, int) from public, anon, authenticated;
grant execute on function crear_caso_con_cupo(text, text, text, int) to service_role;

-- ---------- 4. Permisos explícitos y search_path ----------
-- El panel y el estudiante solo leen estas tablas desde el servidor (con
-- service_role) o con las funciones de arriba: anon y authenticated no
-- necesitan ningún permiso directo. Hoy ya no lo tienen; esto lo deja
-- explícito para que un cambio futuro no lo abra sin querer.
do $$
declare t text;
begin
  foreach t in array array['cuentas', 'perfiles', 'solicitudes_contacto', 'puntos', 'config', 'casos', 'caso_videos']
  loop
    if to_regclass('public.' || t) is not null then
      execute format('revoke all on table public.%I from anon, authenticated', t);
    end if;
  end loop;
end $$;

-- Las funciones security definer de la migración 2026-11-04 se crearon con
-- search_path = public; se les añade pg_temp al final (la forma recomendada:
-- sin ella, un usuario podría crear una tabla temporal con el nombre de una
-- real y que la función la usara en su lugar).
do $$
declare f text;
begin
  foreach f in array array[
    'acceso_cuenta(text, text)', 'cuenta_por_slug_v2(text)', 'casos_activos_v2(text, text)',
    'datos_caso_v2(text, text, text)', 'intento_bloqueado(text, int, int)',
    'registrar_intento(text, int)', 'uso_de_cuentas(text)']
  loop
    if to_regprocedure('public.' || f) is not null then
      execute format('alter function public.%s set search_path = public, pg_temp', f);
    end if;
  end loop;
end $$;

-- ---------- 5. Comprobaciones "not valid" ----------
-- Un cliente debe traer cuenta. (not valid: no revisa las filas que ya existen.)
-- OJO: como perfiles.cuenta_id es "on delete set null", borrar una cuenta a
-- mano desde SQL fallará mientras tenga un perfil cliente: borra primero el
-- usuario (el panel ya lo hace así).
do $$
begin
  if to_regclass('public.perfiles') is not null
     and not exists (select 1 from pg_constraint where conname = 'perfiles_cliente_con_cuenta_chk') then
    alter table public.perfiles add constraint perfiles_cliente_con_cuenta_chk
      check (rol <> 'cliente' or cuenta_id is not null) not valid;
  end if;
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'casos' and column_name = 'laboratorio')
     and not exists (select 1 from pg_constraint where conname = 'casos_laboratorio_array_chk') then
    alter table public.casos add constraint casos_laboratorio_array_chk
      check (jsonb_typeof(laboratorio) = 'array') not valid;
  end if;
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'casos' and column_name = 'vitales')
     and not exists (select 1 from pg_constraint where conname = 'casos_vitales_objeto_chk') then
    alter table public.casos add constraint casos_vitales_objeto_chk
      check (jsonb_typeof(vitales) = 'object') not valid;
  end if;
end $$;

-- ---------- 6. Cerrar las funciones públicas viejas ----------
-- (Equivale a migracion-2026-11-04-cerrar-funciones-viejas.sql; si ya la
-- ejecutaste, esto no cambia nada.) La versión actual solo usa las *_v2.
do $$
declare f text;
begin
  foreach f in array array[
    'cuenta_por_slug(text)', 'casos_activos_de_cuenta(text)', 'caso_publico(text, text)',
    'videos_de_caso_publico(text, text)', 'puntos_publicos_de_cuenta(text, text)',
    'examenes_de_caso_publico(text, text)', 'resumen_examenes_de_cuenta(text)', 'idioma_de_cuenta(text)']
  loop
    if to_regprocedure('public.' || f) is not null then
      execute format('revoke execute on function public.%s from public, anon, authenticated', f);
    end if;
  end loop;
end $$;