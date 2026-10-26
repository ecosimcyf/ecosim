# Cuentas por cliente, landing page y plan de storage — EcoSim web

Diseño conversado y aprobado en chat el 2026-10-26. Cubre el punto 2 de los
cambios decididos para la versión web (el punto 1, maniquí realista, queda
diferido explícitamente hasta que el usuario traiga fotos/detalles del
material físico — no se toca aquí).

## Contexto

Hoy `web/` (repo `ecosimcyf/ecosim`) no tiene ningún concepto de cuenta:

- Una sola contraseña de admin global (`ADMIN_PASSWORD_HASH` en variable de
  entorno, verificada con bcrypt en `src/app/actions/auth.js`).
- Una sola sesión HMAC-firmada (`src/lib/session.js`), sin tabla de usuarios.
- Una sola tabla `casos`, compartida por todo el mundo. La página pública
  (`/`) muestra un menú con **todos** los casos marcados `activo = true`,
  sin distinguir de quién son.
- Un solo bucket de Storage (`videos`), sin organización por cliente.

Quien administrará la plataforma a futuro es **David** (hoy Pablo hace las
pruebas; se le entrega "admin total" a David más adelante). La idea de
negocio es: cada cliente (clínica/universidad) tiene su propia cuenta, con
un plan que define cuántos casos puede subir él mismo y si viene con casos
precargados por David/Pablo. Las cuentas se crean por contacto con un
asesor (no autoservicio público) — así se coordina el pago manualmente.

## Alcance de este documento

1. **Cuentas y roles** — separar los datos de cada cliente, con un
   super-admin (David/Pablo) que ve todo y administra planes/cupos.
2. **Landing page** pública en `/` — muestra la app, sus funcionalidades,
   login para cuentas existentes, y contacto con un asesor para crear
   cuenta nueva.
3. **Plan de storage/crecimiento** — un cupo por cuenta y una
   recomendación de qué vigilar en Supabase a medida que se vendan más
   cuentas.

### Fuera de alcance (diferido o explícitamente descartado)

- Maniquí más realista calcado del material físico (punto 1 — el usuario
  hará la observación presencial primero).
- Pasarela de pago en línea / checkout de autoservicio: "coordinar pagos"
  es manual, vía el asesor, fuera de la app.
- Sistema de plantillas/librería de casos para clonar entre cuentas: para
  v1, los casos precargados los crea David/Pablo directamente dentro de la
  cuenta del cliente, a mano. Se agrega después si hace falta reusar el
  mismo caso en varios clientes sin recrearlo.
- Alertas automáticas o facturación por uso de storage: el cupo por cuenta
  (abajo) es un bloqueo simple, no un sistema de cobro por excedente.
- Suite de pruebas automatizadas (este proyecto no tiene una hoy; se sigue
  probando a mano, igual que el resto de `web/`).

## 1. Cuentas y roles

### Modelo de datos

```sql
-- Cuentas (clientes) y su plan.
create table if not exists cuentas (
  id text primary key default 'cuenta-' || substr(md5(random()::text), 1, 8),
  slug text not null unique,              -- usado en la URL: /c/<slug>
  nombre text not null,                   -- nombre a mostrar (ej. "Clínica X")
  cupo_casos_propios int not null default 0,  -- cuántos casos puede crear el cliente mismo
  cupo_storage_mb int not null default 0,     -- MB de video que puede subir el cliente
  activa boolean not null default true,       -- para suspender sin borrar
  creada_en timestamptz not null default now()
);

-- Un perfil por usuario de Supabase Auth (se crean con la Admin API, no con
-- signup público).
create table if not exists perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  rol text not null check (rol in ('super_admin','cliente')),
  cuenta_id text references cuentas(id) on delete set null
  -- rol='cliente' debe traer cuenta_id; rol='super_admin' lo deja null.
  -- Se valida en código al crear el usuario, no con un check de SQL, para
  -- no complicar el insert en dos pasos (primero el usuario de Auth, luego
  -- esta fila).
);

-- Cuenta inicial para los datos que ya existen hoy (los casos de Pablo).
insert into cuentas (id, slug, nombre, cupo_casos_propios, cupo_storage_mb)
values ('cuenta-demo', 'demo', 'EcoSim (demo)', 9999, 9999)
on conflict (id) do nothing;

alter table casos add column if not exists cuenta_id text references cuentas(id);
update casos set cuenta_id = 'cuenta-demo' where cuenta_id is null;
alter table casos alter column cuenta_id set not null;

-- Para poder calcular cuánto storage lleva usado cada cuenta sin preguntarle
-- a Supabase Storage cada vez.
alter table caso_videos add column if not exists tamano_bytes bigint;

-- Solicitudes de contacto desde la landing (pieza 2).
create table if not exists solicitudes_contacto (
  id bigint generated always as identity primary key,
  nombre text not null,
  clinica text,
  correo text not null,
  telefono text,
  mensaje text,
  estado text not null default 'nueva'
    check (estado in ('nueva','contactada','convertida','descartada')),
  creada_en timestamptz not null default now()
);

alter table cuentas enable row level security;
alter table perfiles enable row level security;
alter table solicitudes_contacto enable row level security;
-- Sin policies públicas en estas 3 tablas: solo las toca el servidor con
-- service_role, igual que ya hace admin.js con el resto de tablas.
grant all on cuentas, perfiles, solicitudes_contacto to service_role;
```

`puntos` (el catálogo de zonas del maniquí perro/gato) **no cambia** — sigue
global, no pertenece a ninguna cuenta.

La policy pública de lectura de `casos` (`activo = true`) **no cambia
tampoco**. El filtro de "cuál cuenta" lo hace el servidor según la URL
(`/c/<slug>` resuelve a un `cuenta_id` antes de consultar), no la RLS.

### Autenticación

Se adopta **Supabase Auth** (ya está instalado vía `@supabase/supabase-js` y
`@supabase/ssr`, no es un servicio nuevo):

- `/admin/login` pasa de "una contraseña global" a un login real de
  Supabase Auth (correo + contraseña). Se elimina el uso de
  `ADMIN_PASSWORD_HASH` / `bcryptjs` una vez migrado.
- Las cuentas de usuario (super_admin o cliente) **no se crean por
  signup público** — las crea el super_admin desde el panel, con la Admin
  API de Supabase (`supabase.auth.admin.inviteUserByEmail`, usando
  `service_role`, igual que ya existe en `src/lib/supabase/admin.js`). Esto
  envía un correo con un link para que la persona ponga su propia
  contraseña — coherente con "nadie crea su cuenta solo".
- Al crear un usuario "cliente", el panel inserta también su fila en
  `perfiles` (`rol='cliente'`, `cuenta_id` de la cuenta correspondiente).
- **Arranque (una sola vez, a mano):** el primer super_admin (Pablo, y
  luego David) no se puede crear desde un panel que todavía no existe. Se
  crea manualmente: Supabase Dashboard → Authentication → Add user, y
  después una fila en `perfiles` con `rol='super_admin'` pegada a mano en
  el SQL Editor. Se documenta el paso exacto cuando se implemente.
- El middleware (`src/middleware.js`) pasa de verificar la cookie HMAC
  propia a verificar la sesión de Supabase Auth (vía `@supabase/ssr`), y
  además mira `perfiles.rol`/`cuenta_id` para decidir a dónde redirigir:
  super_admin puede elegir qué cuenta ver, cliente va directo a la suya.

### Permisos de escritura

Todas las Server Actions (`src/app/actions/admin.js`) siguen escribiendo
con `service_role` (ignora RLS, igual que hoy), pero ahora validan en
código, antes de tocar nada:

- Si el usuario es `super_admin`: puede operar sobre cualquier `cuenta_id`.
- Si es `cliente`: solo puede operar sobre SU `cuenta_id` (el de su
  `perfiles`). Cualquier intento sobre otra cuenta se rechaza.
- Antes de crear un caso nuevo o subir un video, se compara contra
  `cupo_casos_propios` / `cupo_storage_mb` de su cuenta (ver sección 3). Si
  se pasaría del cupo, se bloquea con un mensaje claro: "Llegaste al
  límite de tu plan, contacta a tu asesor para ampliarlo."

### Migración de los datos actuales

1. Correr la migración de arriba: crea `cuenta-demo` y le asigna todos los
   `casos` existentes (incluye la columna `activa=true`, cupos altos para
   no bloquear nada de lo que ya existe).
2. **Aviso importante:** hoy `/` es el simulador que tus estudiantes ya
   usan. Al desplegar este cambio, ese link deja de mostrar el simulador
   (pasa a ser la landing) y el contenido de `cuenta-demo` queda en
   `/c/demo`. Hay que avisar a quien esté usando el link viejo del nuevo
   `/c/demo` antes o el mismo día del despliegue.

## 2. Rutas

| Ruta | Qué muestra | Cambia respecto a hoy |
|---|---|---|
| `/` | Landing pública (sección 3) | Hoy es el simulador; pasa a ser la landing |
| `/c/<slug>` | Lo que hoy vive en `/`: menú de casos activos + maniquí, filtrado a esa cuenta | Nuevo |
| `/admin/login` | Login único (Supabase Auth) | Mismo lugar, login distinto |
| `/admin` | Panel: super_admin elige cuenta a ver; cliente va directo a la suya | Se le agrega el filtro por cuenta |

Un `slug` que no existe o una cuenta con `activa = false` muestran un aviso
genérico ("Este enlace no está disponible, contacta a tu asesor"), nunca un
error técnico.

## 3. Landing page (`/`)

Estructura (el copy final lo escriben Pablo/David, esto es la forma):

1. **Portada** — qué es EcoSim en una frase.
2. **Funcionalidades** — lo que la versión WEB realmente hace hoy: maniquí
   interactivo perro/gato, casos clínicos con descripción + video, varios
   casos activos a la vez con menú de selección, actualización en tiempo
   real cuando el profesor activa/desactiva un caso. (Sin NFC: eso es solo
   de la app de escritorio.)
3. **Para quién es** — clínicas veterinarias, universidades, programas de
   formación.
4. **Contacto con asesor** — formulario corto (nombre, clínica/institución,
   correo, teléfono, mensaje) que una Server Action inserta en
   `solicitudes_contacto` vía `service_role` (el navegador nunca escribe
   directo, mismo patrón que el resto de `web/`). Protegido con el mismo
   limitador de intentos que ya existe en `src/lib/ratelimit.js`.
5. **Iniciar sesión** — botón discreto hacia `/admin/login`.

El panel de admin gana una pestaña nueva, visible solo para super_admin:
**Solicitudes**, para ver las entradas de `solicitudes_contacto` y marcarlas
como contactada/convertida/descartada.

## 4. Storage y crecimiento

Lo que pesa es el **video**, no la base de datos (`casos`/`puntos` son
filas de texto). El storage crece con cuántas cuentas × cuántos videos ×
su peso; el ancho de banda (egress) crece todavía más rápido porque cada
estudiante que abre un video lo descarga — por eso importó tanto el cambio
reciente de cargar solo el caso que el estudiante elige, no todos de
entrada.

- `cuentas.cupo_storage_mb` (ya en el modelo de datos de la sección 1) +
  `caso_videos.tamano_bytes` (se llena al subir) permiten calcular "cuánto
  lleva usado esta cuenta" con una suma simple, sin llamar a la API de
  Storage cada vez.
- Al subir un video que haría pasar el cupo, se **bloquea** con el mismo
  mensaje de "contacta a tu asesor" — coherente con que todo lo demás
  (crear cuenta, coordinar pago) ya pasa por una persona, no por un botón.
- Este documento deja el gancho técnico listo, pero **no define los
  números de cada plan** (cuántos MB por plan, a partir de cuántas cuentas
  conviene subir de plan de Supabase). Eso necesita ver el uso real hoy:
  Supabase Dashboard → **Settings → Usage** (storage, egress, tamaño de
  base de datos). El agente no tiene acceso a ese panel.

## Cómo se prueba

Manual, como el resto de `web/` (no hay suite automatizada):

1. Crear 2 cuentas de prueba vía el flujo de invitación.
2. Confirmar que cada una solo ve sus propios casos — ni en el menú del
   estudiante (`/c/<slug>` de la otra) ni en su panel de admin.
3. Confirmar que super_admin ve ambas cuentas y puede moverse entre ellas.
4. Confirmar que crear un caso de más que el cupo bloquea con el mensaje
   esperado (y que subir un video que excede `cupo_storage_mb` también).
5. Confirmar que el formulario de contacto de la landing guarda en
   `solicitudes_contacto` y aparece en la pestaña "Solicitudes" del panel.
6. Confirmar que `/` (landing) y `/c/demo` (los datos migrados) cargan
   correctamente tras el despliegue.

## Orden sugerido de implementación

1. Migración de esquema (`cuentas`, `perfiles`, `cuenta_id`, `tamano_bytes`,
   `solicitudes_contacto`) — probar primero en un proyecto de Supabase de
   prueba, dado que ya hay datos reales en producción.
2. Supabase Auth: login, middleware, Admin API para invitar usuarios,
   bootstrap manual del primer super_admin.
3. Panel de admin: filtro por cuenta, selector de cuenta para super_admin,
   cupos (casos y storage), pestaña "Solicitudes".
4. Rutas públicas: `/c/<slug>` (mover la lógica que hoy vive en `/`) y
   aviso de "enlace no disponible".
5. Landing page en `/` con el formulario de contacto.
6. Avisar a los usuarios del link viejo antes de desplegar a producción.
