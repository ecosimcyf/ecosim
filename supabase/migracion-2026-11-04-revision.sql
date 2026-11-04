-- ============================================================
-- MIGRACIÓN (2026-11-04): revisión de seguridad y escala
-- ------------------------------------------------------------
-- Pégala UNA vez en Supabase → SQL Editor → New query → Run.
-- Es segura de re-ejecutar. Para deshacerla:
-- migracion-2026-11-04-revision-deshacer.sql
--
-- SOLO AGREGA cosas (columnas, tablas y funciones nuevas): no cambia ni
-- borra nada de lo que usa la versión publicada (main), que sigue
-- funcionando igual. La vista previa de la rama nueva usa esta misma
-- base, por eso tiene que ser así.
--
-- Cuando la rama se mezcle a main, ejecuta TAMBIÉN
-- migracion-2026-11-04-cerrar-funciones-viejas.sql: hasta entonces las
-- funciones viejas (sin código de acceso) siguen abiertas para que main
-- funcione.
-- ============================================================

-- ---------- 1. Código de acceso de los estudiantes (por cuenta) ----------
-- codigo_hash: el código que pone el admin, cifrado (scrypt, desde el
--   servidor). null = la cuenta no pide código.
-- token_acceso: secreto aleatorio que recibe el navegador del estudiante
--   tras escribir bien el código. Las funciones públicas lo exigen. Cambiar
--   o quitar el código lo regenera: todos vuelven a escribir el nuevo.
alter table cuentas add column if not exists codigo_hash text;
alter table cuentas add column if not exists token_acceso text;

-- 'ok' (puede ver), 'codigo' (falta o no vale el token), 'no' (cuenta
-- inexistente o desactivada). Solo la usan las funciones de abajo.
create or replace function acceso_cuenta(p_cuenta_id text, p_token text)
returns text
language sql stable security definer set search_path = public
as $$
  select case
    when c.id is null or not c.activa then 'no'
    when c.token_acceso is null then 'ok'
    when p_token is not null and c.token_acceso = p_token then 'ok'
    else 'codigo'
  end
  from (select 1) x left join cuentas c on c.id = p_cuenta_id;
$$;
revoke execute on function acceso_cuenta(text, text) from public, anon, authenticated;
grant execute on function acceso_cuenta(text, text) to service_role;

-- Cuenta por su slug, con su idioma y si pide código (una sola consulta
-- en vez de dos: antes se pedía el idioma aparte).
create or replace function cuenta_por_slug_v2(p_slug text)
returns table (id text, slug text, nombre text, activa boolean, requiere_codigo boolean, idioma text)
language sql stable security definer set search_path = public
as $$
  select id, slug, nombre, activa, token_acceso is not null, idioma
  from cuentas where slug = p_slug;
$$;
revoke execute on function cuenta_por_slug_v2(text) from public;
grant execute on function cuenta_por_slug_v2(text) to anon, authenticated, service_role;

-- Menú del estudiante: casos activos + qué exámenes trae cada uno (antes
-- eran dos consultas en cada sondeo). Deja fuera los casos sin videos ni
-- exámenes: el estudiante no tendría nada que ver en ellos.
-- Sin el token correcto lanza el error 28000 (la vista pide el código).
create or replace function casos_activos_v2(p_cuenta_id text, p_token text)
returns table (id text, nombre text, descripcion text, especie text, lab boolean, rx boolean, vitales boolean)
language plpgsql stable security definer set search_path = public
as $$
#variable_conflict use_column
declare
  acceso text := acceso_cuenta(p_cuenta_id, p_token);
begin
  if acceso = 'codigo' then
    raise exception 'codigo de acceso requerido' using errcode = '28000';
  end if;
  if acceso <> 'ok' then return; end if;
  return query
    select c.id, c.nombre, c.descripcion, c.especie, x.lab, x.rx, x.vitales
    from casos c
    cross join lateral (
      select
        jsonb_array_length(c.laboratorio) > 0
          or exists (select 1 from caso_archivos a where a.caso_id = c.id and a.tipo = 'lab') as lab,
        exists (select 1 from caso_archivos a where a.caso_id = c.id and a.tipo = 'rx') as rx,
        c.vitales <> '{}'::jsonb as vitales,
        exists (select 1 from caso_videos v where v.caso_id = c.id) as videos
    ) x
    where c.cuenta_id = p_cuenta_id and c.activo
      and (x.videos or x.lab or x.rx or x.vitales)
    order by c.nombre;
end;
$$;
revoke execute on function casos_activos_v2(text, text) from public;
grant execute on function casos_activos_v2(text, text) to anon, authenticated, service_role;

-- Todo lo que el estudiante necesita de UN caso, en una sola consulta
-- (antes eran cuatro): el caso, los puntos de su especie (SIN nombre: sería
-- una pista), sus videos con su tamaño (para decidir si se precargan) y sus
-- exámenes. null si el caso no existe, no es de la cuenta o está apagado.
create or replace function datos_caso_v2(p_cuenta_id text, p_caso_id text, p_token text)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  acceso text := acceso_cuenta(p_cuenta_id, p_token);
  c casos%rowtype;
begin
  if acceso = 'codigo' then
    raise exception 'codigo de acceso requerido' using errcode = '28000';
  end if;
  if acceso <> 'ok' then return null; end if;
  select * into c from casos
   where casos.id = p_caso_id and casos.cuenta_id = p_cuenta_id and casos.activo;
  if not found then return null; end if;
  return jsonb_build_object(
    'caso', jsonb_build_object('id', c.id, 'nombre', c.nombre, 'especie', c.especie),
    'puntos', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'vista', p.vista, 'x', p.x, 'y', p.y) order by p.id)
                        from puntos p where p.cuenta_id = p_cuenta_id and p.especie = c.especie), '[]'::jsonb),
    'videos', coalesce((select jsonb_agg(jsonb_build_object('punto_id', v.punto_id, 'video_url', v.video_url, 'tamano_bytes', v.tamano_bytes))
                        from caso_videos v where v.caso_id = c.id), '[]'::jsonb),
    'examenes', jsonb_build_object(
      'laboratorio', c.laboratorio,
      'vitales', c.vitales,
      'archivos', coalesce((select jsonb_agg(jsonb_build_object(
                    'id', a.id, 'tipo', a.tipo, 'titulo', a.titulo, 'url', a.url, 'mime', a.mime)
                    order by a.tipo, a.orden, a.creado_en)
                  from caso_archivos a where a.caso_id = c.id), '[]'::jsonb))
  );
end;
$$;
revoke execute on function datos_caso_v2(text, text, text) from public;
grant execute on function datos_caso_v2(text, text, text) to anon, authenticated, service_role;

-- ---------- 2. Límite de intentos compartido por todos los servidores ----------
-- Antes vivía en la memoria de cada servidor de Vercel (cada uno con su
-- propio contador). Ahora es una fila por "clave" (p. ej. 'login:1.2.3.4').
create table if not exists intentos (
  clave text primary key check (char_length(clave) <= 200),
  conteo int not null default 0,
  desde timestamptz not null default now()
);
alter table intentos enable row level security;
revoke all on intentos from anon, authenticated;
grant select, insert, update, delete on intentos to service_role;

create or replace function intento_bloqueado(p_clave text, p_max int, p_ventana_seg int)
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select conteo >= p_max from intentos
                   where clave = p_clave and desde > now() - make_interval(secs => p_ventana_seg)), false);
$$;

-- Suma un intento de forma atómica (dos peticiones a la vez no se pisan) y
-- devuelve cuántos lleva en la ventana actual.
create or replace function registrar_intento(p_clave text, p_ventana_seg int)
returns int
language sql security definer set search_path = public
as $$
  insert into intentos as i (clave, conteo, desde) values (p_clave, 1, now())
  on conflict (clave) do update set
    conteo = case when i.desde <= now() - make_interval(secs => p_ventana_seg) then 1 else i.conteo + 1 end,
    desde  = case when i.desde <= now() - make_interval(secs => p_ventana_seg) then now() else i.desde end
  returning conteo;
$$;

revoke execute on function intento_bloqueado(text, int, int) from public, anon, authenticated;
revoke execute on function registrar_intento(text, int) from public, anon, authenticated;
grant execute on function intento_bloqueado(text, int, int) to service_role;
grant execute on function registrar_intento(text, int) to service_role;

-- ---------- 3. Subidas reservadas (cuentan en el cupo) ----------
-- Al firmar una URL de subida se anota aquí; la fila se quita al guardar el
-- archivo en su caso. Mientras tanto (máx. 24 h) cuenta en el cupo, y la
-- limpieza diaria borra las abandonadas junto con su archivo.
create table if not exists subidas_pendientes (
  bucket text not null check (bucket in ('videos', 'examenes')),
  path text not null,
  cuenta_id text not null references cuentas(id) on delete cascade,
  tamano_bytes bigint not null default 0,
  creada_en timestamptz not null default now(),
  primary key (bucket, path)
);
create index if not exists subidas_pendientes_cuenta_idx on subidas_pendientes (cuenta_id, creada_en);
alter table subidas_pendientes enable row level security;
revoke all on subidas_pendientes from anon, authenticated;
grant select, insert, update, delete on subidas_pendientes to service_role;

-- ---------- 4. Uso de cada cuenta en UNA consulta ----------
-- Casos y bytes usados (videos + exámenes + subidas en curso de las últimas
-- 24 h). Sin cuenta: todas. Antes eran 2 consultas por cuenta y se leían
-- todas las filas de videos para sumarlas en el servidor.
create or replace function uso_de_cuentas(p_cuenta_id text default null)
returns table (cuenta_id text, casos int, bytes bigint)
language sql stable security definer set search_path = public
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

-- ---------- 5. Registro de errores del servidor ----------
-- Lo que antes solo quedaba en los registros de Vercel (y nadie veía),
-- ahora se ve en el panel del super_admin, pestaña «Errores». La limpieza
-- diaria borra los de más de 30 días.
create table if not exists errores (
  id bigint generated always as identity primary key,
  creado_en timestamptz not null default now(),
  origen text not null check (char_length(origen) <= 80),
  mensaje text not null check (char_length(mensaje) <= 500),
  detalle text check (char_length(detalle) <= 4000)
);
create index if not exists errores_creado_idx on errores (creado_en desc);
alter table errores enable row level security;
revoke all on errores from anon, authenticated;
grant select, insert, delete on errores to service_role;
