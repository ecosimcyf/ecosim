-- ============================================================
-- DESHACER migracion-2026-11-25-tienda.sql
-- ------------------------------------------------------------
-- !!! AVISOS ANTES DE EJECUTARLO !!!
--  1. HAZ UN RESPALDO ANTES (npm run respaldo). Este script BORRA las tablas
--     adquisiciones y catalogo_casos: se pierde para siempre el historial de
--     solicitudes, pagos marcados y entregas, y los precios de referencia.
--  2. NO DESPLIEGUES una versión del código ANTERIOR a esta rama después de
--     haber hecho entregas. El código viejo borra archivos de Storage sin
--     mirar a qué cuenta pertenece ni si otro caso los sigue usando: al
--     borrar un caso o una cuenta rompería el catálogo y los casos de OTRAS
--     clínicas que compraron (sus videos y exámenes apuntan a los objetos de
--     la cuenta «catalogo»). Si hay que volver atrás en el código, conserva
--     el borrado seguro (src/lib/entrega.js, borrarObjetosSeguros) o no
--     borres casos ni cuentas hasta tenerlo de vuelta.
-- ------------------------------------------------------------
-- Quita la tienda de casos y devuelve los cupos a su cálculo anterior.
-- OJO: los casos que una clínica ya compró y recibió se QUEDAN en su cuenta,
-- pero pasan a contar como casos propios (cupo de casos) y sus archivos
-- compartidos (que siguen siendo los mismos objetos del catálogo) pasan a
-- contar en su almacenamiento. NO se borra la cuenta «catalogo» ni sus
-- casos. Sin la tienda, borrar a mano un caso de «catalogo» con copias ya
-- entregadas puede dejar a esas clínicas sin videos si el panel (que sí
-- protege los archivos compartidos) no es quien lo borra.
-- ============================================================
drop function if exists reclamar_entrega(text);

drop table if exists adquisiciones;
drop table if exists catalogo_casos;

drop index if exists casos_origen_unico_idx;
alter table casos drop column if exists origen_catalogo_id;

-- Cálculo de cupos de migracion-2026-11-24-arreglos.sql (todo cuenta).
create or replace function uso_de_cuentas(p_cuenta_id text default null)
returns table (cuenta_id text, casos int, bytes bigint)
language sql stable security definer set search_path = public, pg_temp
as $$
  select cu.id,
    (select count(*)::int from casos c where c.cuenta_id = cu.id),
    (coalesce((select sum(v.tamano_bytes) from caso_videos v join casos c on c.id = v.caso_id where c.cuenta_id = cu.id), 0)
     + coalesce((select sum(a.tamano_bytes) from caso_archivos a join casos c on c.id = a.caso_id where c.cuenta_id = cu.id), 0)
     + coalesce((select sum(s.tamano_bytes) from subidas_pendientes s
                 where s.cuenta_id = cu.id and s.creada_en > now() - interval '24 hours'), 0))::bigint
  from cuentas cu
  where p_cuenta_id is null or cu.id = p_cuenta_id;
$$;
revoke execute on function uso_de_cuentas(text) from public, anon, authenticated;
grant execute on function uso_de_cuentas(text) to service_role;

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
