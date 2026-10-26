# Cuentas por cliente, landing page y plan de storage — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separar los datos de cada cliente en su propia cuenta (login propio, datos aislados, cupos por plan), agregar una landing page pública con contacto comercial, y dejar listo el gancho de control de storage — sin tocar el maniquí realista (diferido) ni ninguna pasarela de pago.

**Architecture:** Se añade una capa de cuentas (`cuentas`, `perfiles`) sobre el esquema ya existente, con Supabase Auth reemplazando la contraseña única de hoy. `casos` gana `cuenta_id`; `puntos` sigue global. La vista del estudiante se mueve de `/` a `/c/<slug>`, dejando `/` libre para la landing. Todo lo de escritura sigue pasando por Server Actions con `service_role`, ahora validando `cuenta_id` en cada una.

**Tech Stack:** Next.js 15 (App Router, JS), Supabase (Postgres + Auth + Storage), `@supabase/ssr`, `@supabase/supabase-js`. Sin frameworks de pruebas nuevos.

**Spec:** [`../specs/2026-10-26-cuentas-clientes-landing-storage-design.md`](../specs/2026-10-26-cuentas-clientes-landing-storage-design.md)

## Nota sobre pruebas

`web/` no tiene ninguna suite de pruebas automatizada hoy (ni Jest, ni Playwright, ni scripts `probar-*`), y el spec ya decidió —con el usuario— seguir probando a mano, igual que el resto del proyecto. Por eso cada tarea de este plan reemplaza "escribe el test, corre el test" por pasos de **verificación manual** concretos (qué hacer, qué resultado esperar), en vez de inventar un framework de pruebas nuevo solo para esta funcionalidad.

## Global Constraints

- Sin autoservicio público: cuentas y usuarios los crea solo un `super_admin` (nunca un formulario de signup).
- Sin pasarela de pago en línea.
- `puntos` (catálogo del maniquí) sigue global — nunca se le agrega `cuenta_id`.
- Toda escritura pasa por Server Actions con `service_role`; el navegador nunca escribe directo (excepto la subida de video por URL firmada, patrón ya existente).
- Mensajes de UI en español, en el mismo tono que el resto de la app.
- No se toca NFC ni ningún código de la app de escritorio (fuera de `web/`).
- No se construye un sistema de plantillas/librería de casos ni alertas automáticas de storage — los cupos son un bloqueo simple (ver spec, sección "Fuera de alcance").

## Review Focus

- Un usuario `cliente` llama una Server Action de escritura (`renombrarCaso`, `eliminarCaso`, `guardarVideoCaso`, etc.) pasando el `casoId` de OTRA cuenta a mano (sin pasar por la UI) — debe no afectar ninguna fila, no solo "no mostrarse en la lista". → Tarea 3.
- Un usuario `cliente` intenta crear, mover o borrar un PUNTO del catálogo global del maniquí (`addPunto`/`actualizarPunto`/`eliminarPunto`) — eso afecta a TODAS las cuentas, debe ser exclusivo de `super_admin`. → Tarea 3.
- Cupo de casos en el límite exacto: crear hasta el cupo funciona, el siguiente se bloquea con el mensaje de plan, no con un error genérico de Postgres. → Tarea 3.
- Cupo de storage: un solo video que por sí mismo ya excede el cupo restante se bloquea ANTES de subir, no a mitad de la subida. → Tarea 4.
- Un estudiante visita `/c/<slug>` de una cuenta suspendida (`activa=false`) o un slug inexistente — debe ver un aviso genérico, nunca un error técnico ni datos de otra cuenta. → Tarea 5.

---

## Task 1: Migración de esquema

**Files:**
- Modify: `supabase/schema.sql` (agregar bloque de migración al final, mismo estilo que el bloque de "varios casos activos" ya existente)

**Interfaces:**
- Produces: tablas `cuentas`, `perfiles`, `solicitudes_contacto`; columna `casos.cuenta_id` (not null); columna `caso_videos.tamano_bytes`; vista `cuentas_publicas` (id, slug, nombre, activa).

- [ ] **Step 1: Añadir el bloque de migración a `supabase/schema.sql`**

```sql
-- ============================================================
-- MIGRACIÓN (2026-10-26): cuentas por cliente, cupos y solicitudes
-- ============================================================
create table if not exists cuentas (
  id text primary key default 'cuenta-' || substr(md5(random()::text), 1, 8),
  slug text not null unique,
  nombre text not null,
  cupo_casos_propios int not null default 0,
  cupo_storage_mb int not null default 0,
  activa boolean not null default true,
  creada_en timestamptz not null default now()
);

create table if not exists perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  rol text not null check (rol in ('super_admin','cliente')),
  cuenta_id text references cuentas(id) on delete set null
  -- rol='cliente' debe traer cuenta_id; rol='super_admin' lo deja null.
  -- Se valida en código (actions/admin.js), no con un check de SQL, porque
  -- el alta ocurre en 2 pasos (usuario de Auth, luego esta fila).
);

insert into cuentas (id, slug, nombre, cupo_casos_propios, cupo_storage_mb)
values ('cuenta-demo', 'demo', 'EcoSim (demo)', 9999, 9999)
on conflict (id) do nothing;

alter table casos add column if not exists cuenta_id text references cuentas(id);
update casos set cuenta_id = 'cuenta-demo' where cuenta_id is null;
alter table casos alter column cuenta_id set not null;

alter table caso_videos add column if not exists tamano_bytes bigint;

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
-- service_role (igual que ya hace admin.js con el resto de tablas).
grant all on cuentas, perfiles, solicitudes_contacto to service_role;

-- Vista pública para resolver "slug -> cuenta" sin exponer cupos ni toda
-- la tabla cuentas al rol anónimo (mismo patrón que puntos_publicos).
create or replace view cuentas_publicas
  with (security_invoker = false)
  as select id, slug, nombre, activa from cuentas;
grant select on cuentas_publicas to anon, authenticated;
```

- [ ] **Step 2: Verificar manualmente en un proyecto de Supabase de PRUEBA**

Pegar el bloque completo en el SQL Editor y correrlo. Confirmar: las 4 tablas/vista nuevas existen, `select * from casos` muestra `cuenta_id = 'cuenta-demo'` en todas las filas existentes, y `select * from cuentas_publicas` devuelve la fila `demo` con `activa = true`.

- [ ] **Step 3: Commit**

```bash
git add supabase/schema.sql
git commit -m "feat: esquema de cuentas, cupos y solicitudes de contacto"
```

---

## Task 2: Autenticación con Supabase Auth

**Files:**
- Create: `scripts/crear-super-admin.mjs`
- Create: `src/lib/supabase/middleware.js`
- Modify: `src/lib/supabase/server.js`
- Modify: `src/middleware.js`
- Modify: `src/app/admin/login/page.js`
- Modify: `src/app/actions/auth.js`
- Modify: `src/app/actions/admin.js:22-27` (solo `requerirAdmin`, el resto del archivo lo tocan las Tareas 3-4)
- Delete: `src/lib/session.js`

**Interfaces:**
- Produces: `crearClienteServidorAuth(): SupabaseClient` (`src/lib/supabase/server.js`) — cliente ligado a las cookies de la petición, con `.auth.getUser()/.signInWithPassword()/.signOut()` funcionando.
- Produces: `actualizarSesion(request: NextRequest): Promise<{ response: NextResponse, usuario: object|null }>` (`src/lib/supabase/middleware.js`).
- Produces: `requerirAdmin(): Promise<{ rol: 'super_admin'|'cliente', cuentaId: string|null }>` — lanza `Error('No autorizado')` si no hay sesión o no hay fila en `perfiles`. Lo usan todas las acciones de `admin.js` desde la Tarea 3.
- Produces: `requerirSuperAdmin(): Promise<{ rol: 'super_admin', cuentaId: null }>` — igual, pero además exige `rol === 'super_admin'`.

- [ ] **Step 1: Escribir `scripts/crear-super-admin.mjs`**

Script Node ESM suelto (mismo estilo que `scripts/copiar-ffmpeg.mjs`), sin dependencias nuevas: lee `NEXT_PUBLIC_SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` parseando `.env.local` a mano (líneas `CLAVE=valor`, ignorando comentarios y líneas vacías — no hay que asumir Node ≥20.6 con `--env-file`), recibe `correo` y `contraseña` como `process.argv`, usa `createClient` de `@supabase/supabase-js` para `auth.admin.createUser({ email, password, email_confirm: true })` y luego inserta `{ id, rol: 'super_admin', cuenta_id: null }` en `perfiles`. Imprime éxito/error por consola.

- [ ] **Step 2: Verificar manualmente — crear el primer super_admin de prueba**

Correr `node scripts/crear-super-admin.mjs <correo> <contraseña>` contra el proyecto de Supabase de PRUEBA. Confirmar en el dashboard (Authentication → Users) que el usuario existe y, por SQL Editor, que `perfiles` tiene su fila con `rol='super_admin'`.

- [ ] **Step 3: Implementar `crearClienteServidorAuth()` en `src/lib/supabase/server.js`**

`createServerClient` de `@supabase/ssr`, usando `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY`, con `cookies: { getAll, setAll }` leyendo/escribiendo vía `cookies()` de `next/headers`; envolver la escritura (`setAll`) en try/catch, porque en Server Components escribir cookies no está permitido y debe ser un no-op silencioso ahí (sí funciona en Server Actions).

- [ ] **Step 4: Implementar `src/lib/supabase/middleware.js` → `actualizarSesion(request)`**

Crea `let response = NextResponse.next({ request })`, un `createServerClient` cuyo `setAll` escribe tanto en `request.cookies` como en `response.cookies`, llama `const { data: { user } } = await supabase.auth.getUser()`, devuelve `{ response, usuario: user ?? null }`.

- [ ] **Step 5: Reescribir `src/middleware.js`**

Llamar `const { response, usuario } = await actualizarSesion(request)`; si `pathname` empieza con `/admin`, no es `/admin/login`, y `!usuario` → `NextResponse.redirect(new URL('/admin/login', request.url))`; en cualquier otro caso devolver `response`. El `matcher` no cambia.

- [ ] **Step 6: Reescribir `src/app/admin/login/page.js`**

Añadir `<input name="correo" type="email" placeholder="Correo" autoFocus>` antes del campo de contraseña (quitar `autoFocus` de este último).

- [ ] **Step 7: Reescribir `src/app/actions/auth.js`**

`login(_prevState, formData)`: lee `correo` y `password`; mismo bloqueo por IP que hoy (`estaBloqueado`/`registrarIntento`/`limpiarIntentos`, sin cambios); en vez de bcrypt, `const { error } = await crearClienteServidorAuth().auth.signInWithPassword({ email: correo, password })`; si hay error, `registrarIntento(ip)` y devolver `{ error: 'Correo o contraseña incorrectos.' }`; si no, `limpiarIntentos(ip)` y `redirect('/admin')`. `logout()`: `await crearClienteServidorAuth().auth.signOut()`, luego `redirect('/admin/login')`. Quitar los imports de `bcryptjs` y de `@/lib/session`.

- [ ] **Step 8: Reemplazar `requerirAdmin()` en `src/app/actions/admin.js`**

```js
async function requerirAdmin() {
  const { data: { user } } = await crearClienteServidorAuth().auth.getUser();
  if (!user) throw new Error('No autorizado');
  const { data: perfil } = await crearClienteAdmin()
    .from('perfiles').select('rol,cuenta_id').eq('id', user.id).maybeSingle();
  if (!perfil) throw new Error('No autorizado');
  return { rol: perfil.rol, cuentaId: perfil.cuenta_id };
}

async function requerirSuperAdmin() {
  const r = await requerirAdmin();
  if (r.rol !== 'super_admin') throw new Error('No autorizado');
  return r;
}
```

`leerDatosAdmin()` no necesita cambios en este paso: sigue llamando `await requerirAdmin();` sin usar el valor devuelto, así que compila igual aunque la función ahora devuelva un objeto en vez de nada. La Tarea 3 la reescribe por completo para usar `rol`/`cuentaId`.

- [ ] **Step 9: Borrar `src/lib/session.js`**

Ya no lo usa nadie tras los pasos anteriores.

- [ ] **Step 10: Verificar manualmente (`npm run dev`, contra el proyecto de prueba)**

(a) Entrar a `/admin` sin sesión → redirige a `/admin/login`. (b) Iniciar sesión con el correo/contraseña del Step 2 → entra a `/admin`. (c) Contraseña incorrecta 6 veces seguidas desde el mismo origen → el 6º intento muestra el aviso de bloqueo. (d) "Cerrar sesión" → vuelve a `/admin/login`, y `/admin` vuelve a redirigir.

- [ ] **Step 11: `npm run build`**

Confirmar que compila sin errores.

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "feat: login con Supabase Auth, reemplaza la contraseña única"
```

---

## Task 3: Cuentas en el panel — filtro, selector de super_admin, alta de cuentas y cupo de casos

**Files:**
- Modify: `src/app/actions/admin.js`
- Modify: `src/app/admin/page.js`
- Modify: `src/app/admin/AdminPanel.jsx`

**Interfaces:**
- Consumes: `requerirAdmin()`, `requerirSuperAdmin()` (Tarea 2).
- Produces: `leerDatosAdmin(): Promise<{ rol, cuentaId, cuentas: Array<{id,slug,nombre,activa,cupo_casos_propios,cupo_storage_mb}>|null, cupoCasosPropios, puntos, casos, videosPorCaso }>`.
- Produces: `elegirCuentaAdmin(cuentaId): Promise<{ cuentaId, cupoCasosPropios, puntos, casos, videosPorCaso }>` (solo `super_admin`).
- Produces: `crearCuenta({ slug, nombre, cupoCasosPropios, cupoStorageMb, correo }): Promise<{ cuentas }>` (solo `super_admin`).
- Modifica firmas: `crearCaso(cuentaId, nombre, especie)`, `renombrarCaso(cuentaId, casoId, nombre)`, `cambiarEspecieCaso(cuentaId, casoId, especie)`, `eliminarCaso(cuentaId, casoId)`, `alternarCasoActivo(cuentaId, casoId, activo)`.
- Modifica: `addPunto`, `actualizarPunto`, `eliminarPunto` ahora llaman `requerirSuperAdmin()`.

- [ ] **Step 1: `leerTodo(supabase, cuentaId)` filtra por cuenta**

Agregar `.eq('cuenta_id', cuentaId)` al `select` de `casos` (línea `supabase.from('casos').select(...)`). El `select` de `puntos` no cambia.

- [ ] **Step 2: Helpers nuevos en `admin.js`**

`contarCasosDeCuenta(supabase, cuentaId)` → `.from('casos').select('id', { count: 'exact', head: true }).eq('cuenta_id', cuentaId)`, devuelve el número. `listarCuentasInterno(supabase)` → `.from('cuentas').select('id,slug,nombre,activa,cupo_casos_propios,cupo_storage_mb').order('nombre')`.

- [ ] **Step 3: Reescribir `leerDatosAdmin()`**

```js
export async function leerDatosAdmin() {
  const { rol, cuentaId } = await requerirAdmin();
  const supabase = crearClienteAdmin();
  if (rol === 'super_admin') {
    const cuentas = await listarCuentasInterno(supabase);
    return { rol, cuentaId: null, cuentas, cupoCasosPropios: null, puntos: [], casos: [], videosPorCaso: {} };
  }
  const { data: cuenta } = await supabase.from('cuentas').select('cupo_casos_propios').eq('id', cuentaId).single();
  const datos = await leerTodo(supabase, cuentaId);
  return { rol, cuentaId, cuentas: null, cupoCasosPropios: cuenta.cupo_casos_propios, ...datos };
}
```

- [ ] **Step 4: Añadir `elegirCuentaAdmin(cuentaId)`**

```js
export async function elegirCuentaAdmin(cuentaId) {
  await requerirSuperAdmin();
  const supabase = crearClienteAdmin();
  const { data: cuenta } = await supabase.from('cuentas').select('cupo_casos_propios').eq('id', cuentaId).single();
  const datos = await leerTodo(supabase, cuentaId);
  return { cuentaId, cupoCasosPropios: cuenta.cupo_casos_propios, ...datos };
}
```

- [ ] **Step 5: Añadir `crearCuenta({ slug, nombre, cupoCasosPropios, cupoStorageMb, correo })`**

`await requerirSuperAdmin()`; insertar en `cuentas`; si `error.code === '23505'` (slug duplicado) → `throw new Error('Ya existe una cuenta con ese slug.')`; si va bien, `await crearClienteAdmin().auth.admin.inviteUserByEmail(correo)` y luego `insert` en `perfiles` `{ id: usuario.data.user.id, rol: 'cliente', cuenta_id: nuevaCuenta.id }`; devolver `{ cuentas: await listarCuentasInterno(supabase) }`.

- [ ] **Step 6: Firma + permiso + cupo en `crearCaso`**

```js
export async function crearCaso(cuentaId, nombre, especie) {
  const { rol, cuentaId: miCuentaId } = await requerirAdmin();
  if (rol === 'cliente' && cuentaId !== miCuentaId) throw new Error('No autorizado');
  const supabase = crearClienteAdmin();
  if (rol === 'cliente') {
    const { data: cuenta } = await supabase.from('cuentas').select('cupo_casos_propios').eq('id', cuentaId).single();
    const n = await contarCasosDeCuenta(supabase, cuentaId);
    if (n >= cuenta.cupo_casos_propios) {
      throw new Error('Llegaste al límite de casos de tu plan. Contacta a tu asesor para ampliarlo.');
    }
  }
  // resto igual que hoy, pero el insert incluye cuenta_id: cuentaId
}
```

(`super_admin` nunca choca con el cupo — el cupo limita lo que crea el cliente, no lo que el equipo precarga.)

- [ ] **Step 7: Firma + permiso + alcance en `renombrarCaso`, `cambiarEspecieCaso`, `alternarCasoActivo`, `eliminarCaso`**

Mismo chequeo de permiso que el Step 6 (sin el chequeo de cupo). Cada `update`/`delete` agrega `.eq('cuenta_id', cuentaId)` junto a `.eq('id', casoId)`, de modo que un `casoId` que no pertenezca a `cuentaId` no afecte ninguna fila aunque el chequeo de arriba tuviera un error.

- [ ] **Step 8: `addPunto`, `actualizarPunto`, `eliminarPunto` pasan a `requerirSuperAdmin()`**

Cambiar la primera línea de las 3 funciones de `await requerirAdmin();` a `await requerirSuperAdmin();`. Sin más cambios.

- [ ] **Step 9: `AdminPanel.jsx` — selector de cuentas y alta (solo super_admin)**

Nueva sección al principio del panel, visible solo si `datos.rol === 'super_admin'`: un `<select>` con `datos.cuentas` (al elegir, llama `elegirCuentaAdmin(id)` y aplica el resultado con `setDatos((d) => ({ ...d, ...resultado }))`) y un formulario (slug, nombre, cupo de casos, cupo de storage, correo) que llama `crearCuenta(...)` y refresca `datos.cuentas` con la respuesta.

- [ ] **Step 10: `AdminPanel.jsx` — ocultar secciones de caso sin cuenta elegida**

Las secciones "Maniquí", "Casos" y "Videos del caso" solo se renderizan si `datos.cuentaId` tiene valor (siempre lo tiene para `cliente`; para `super_admin`, solo tras elegir una cuenta en el Step 9).

- [ ] **Step 11: `AdminPanel.jsx` — pasar `cuentaId` en cada llamada existente**

Actualizar `crear`, `activar`, `renombrar`, `cambiarEspecie`, `borrarCaso` para pasar `datos.cuentaId` como primer argumento a `crearCaso`/`alternarCasoActivo`/`renombrarCaso`/`cambiarEspecieCaso`/`eliminarCaso`.

- [ ] **Step 12: `AdminPanel.jsx` — mostrar el cupo de casos**

Junto a la tarjeta "Casos activos", mostrar `datos.casos.length` de `datos.cupoCasosPropios` (omitir el texto si `cupoCasosPropios` es `null`, caso de `super_admin` sin cuenta elegida).

- [ ] **Step 13: Verificar manualmente con 2 cuentas + 1 super_admin de prueba**

Usar el script de la Tarea 2 para el super_admin y `crearCuenta` para 2 cuentas cliente ("A" y "B"). Confirmar: (a) el cliente de A solo ve y edita los casos de A; (b) llamar `renombrarCaso(cuentaIdDeA, casoIdDeB, 'x')` desde la sesión de A (herramientas de desarrollador) no cambia nada — caso de Review Focus; (c) con `cupo_casos_propios=1` en A, crear un caso funciona, el segundo se bloquea con el mensaje de plan — caso de Review Focus; (d) el cliente de A llamando `actualizarPunto` directo se rechaza con "No autorizado" — caso de Review Focus; (e) el super_admin cambia entre A y B desde el selector y ve los datos correctos de cada una.

- [ ] **Step 14: `npm run build`**

- [ ] **Step 15: Commit**

```bash
git add -A
git commit -m "feat: cuentas en el panel — filtro, selector y cupo de casos"
```

---

## Task 4: Cupo de storage por cuenta

**Files:**
- Modify: `src/app/actions/admin.js`
- Modify: `src/app/admin/AdminPanel.jsx`

**Interfaces:**
- Consumes: `requerirAdmin()` (Tarea 2), patrón de verificación de cuenta de la Tarea 3.
- Modifica firmas: `crearUrlSubidaVideo(cuentaId, tamanoBytes)`, `guardarVideoCaso(cuentaId, casoId, puntoId, path, tamanoBytes)`.
- Produces: `usoStorageBytes(supabase, cuentaId): Promise<number>`.

- [ ] **Step 1: Helper `usoStorageBytes(supabase, cuentaId)`**

```js
async function usoStorageBytes(supabase, cuentaId) {
  const { data } = await supabase
    .from('caso_videos')
    .select('tamano_bytes, casos!inner(cuenta_id)')
    .eq('casos.cuenta_id', cuentaId);
  return (data || []).reduce((s, r) => s + (r.tamano_bytes || 0), 0);
}
```

- [ ] **Step 2: `crearUrlSubidaVideo(cuentaId, tamanoBytes)` — chequeo de cupo antes de firmar la URL**

Mismo chequeo de permiso que en la Tarea 3 (`cliente` solo su propia cuenta). Si `rol === 'cliente'`: leer `cupo_storage_mb` de la cuenta, `usoActual = await usoStorageBytes(supabase, cuentaId)`; si `usoActual + tamanoBytes > cupoStorageMb * 1024 * 1024` → `throw new Error('Llegaste al límite de almacenamiento de tu plan. Contacta a tu asesor para ampliarlo.')` ANTES de llamar `createSignedUploadUrl`.

- [ ] **Step 3: `guardarVideoCaso(cuentaId, casoId, puntoId, path, tamanoBytes)` — pertenencia + registrar tamaño**

Antes del `upsert`, verificar que el caso pertenece a la cuenta: `select id from casos where id=casoId and cuenta_id=cuentaId` (si no hay fila, `throw new Error('No autorizado')`). El `upsert` en `caso_videos` incluye ahora `tamano_bytes: tamanoBytes`.

- [ ] **Step 4: `AdminPanel.jsx` — pasar `cuentaId` y tamaño en la subida**

En `onFileChange`: `crearUrlSubidaVideo(datos.cuentaId, aSubir.size)` y, tras subir, `guardarVideoCaso(datos.cuentaId, casoEnEdicion, casoPuntoSel, path, aSubir.size)`.

- [ ] **Step 5: Mostrar el uso de storage**

Incluir `usoStorageMb` (resultado de `usoStorageBytes` dividido entre 1024*1024, redondeado) en lo que devuelven `leerDatosAdmin`/`elegirCuentaAdmin` (Tarea 3), y mostrarlo junto al cupo de casos en `AdminPanel.jsx`: "Storage: X / Y MB".

- [ ] **Step 6: Verificar manualmente**

Con `cupo_storage_mb=1` en una cuenta de prueba: subir un video de prueba más pesado que 1 MB → se bloquea ANTES de empezar la subida, con el mensaje esperado (no a mitad de la subida) — caso de Review Focus. Subir uno que sí entra en el cupo → funciona, y el contador de uso sube en el panel.

- [ ] **Step 7: `npm run build`**

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: cupo de storage por cuenta"
```

---

## Task 5: Ruta pública `/c/[slug]`

**Files:**
- Modify: `src/lib/datos.js`
- Create: `src/app/c/[slug]/page.js`
- Move: `src/app/VistaPrincipal.jsx` → `src/app/c/[slug]/VistaPrincipal.jsx`

**Interfaces:**
- Produces: `resolverCuenta(supabase, slug): Promise<{id,slug,nombre,activa}|null>`.
- Modifica firmas: `listarCasosActivos(supabase, cuentaId)`, `cargarDatosDeCaso(supabase, casoId, cuentaId)`.

- [ ] **Step 1: `resolverCuenta(supabase, slug)` en `src/lib/datos.js`**

```js
export async function resolverCuenta(supabase, slug) {
  const { data } = await supabase
    .from('cuentas_publicas').select('id,slug,nombre,activa').eq('slug', slug).maybeSingle();
  return data || null;
}
```

- [ ] **Step 2: `listarCasosActivos(supabase, cuentaId)` filtra por cuenta**

Agregar `.eq('cuenta_id', cuentaId)` al `select` existente.

- [ ] **Step 3: `cargarDatosDeCaso(supabase, casoId, cuentaId)` filtra por cuenta**

En el primer `select` (el que trae `especie` del caso), agregar `.eq('cuenta_id', cuentaId)`. Si no hay fila (caso de otra cuenta, o no existe), sigue devolviendo `{ casoId: null }` igual que hoy.

- [ ] **Step 4: Mover `VistaPrincipal.jsx` a `src/app/c/[slug]/VistaPrincipal.jsx`**

Añadir una prop `cuentaId`. Pasarla en las 2 llamadas del lado del cliente que hoy llaman a `listarCasosActivos`/`cargarDatosDeCaso` (en `abrirCaso` y en `recargarLista`, dentro del efecto de tiempo real).

- [ ] **Step 5: Crear `src/app/c/[slug]/page.js`**

Server Component: `const { slug } = await params;`; `crearClienteServidor()`; `const cuenta = await resolverCuenta(supabase, slug);`; si `!cuenta || !cuenta.activa` → renderizar un aviso simple ("Este enlace no está disponible. Contacta a tu asesor.") en vez de `VistaPrincipal`; si no, `const casosActivosIniciales = await listarCasosActivos(supabase, cuenta.id);` y renderizar `<VistaPrincipal casosActivosIniciales={casosActivosIniciales} cuentaId={cuenta.id} />`. Mantener `export const dynamic = 'force-dynamic'`.

- [ ] **Step 6: Verificar manualmente**

Con una cuenta de prueba con 1-2 casos activos (de la Tarea 3): visitar `/c/<su-slug>` → el menú muestra solo esos casos. Visitar `/c/slug-que-no-existe` → aviso genérico. Poner `activa=false` a mano en SQL y recargar → mismo aviso genérico — caso de Review Focus. Activar/desactivar un caso desde el panel sigue reflejándose en tiempo real en esta ruta.

(`src/app/page.js` queda SIN tocar en esta tarea — sigue mostrando el simulador global viejo hasta la Tarea 6. Así ambas rutas conviven sin romper nada mientras se prueba.)

- [ ] **Step 7: `npm run build`**

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: ruta publica /c/[slug] por cuenta"
```

---

## Task 6: Landing page en `/` + formulario de contacto

**Files:**
- Modify: `src/app/page.js` (se reemplaza por completo)
- Create: `src/app/actions/contacto.js`
- Create: `src/app/FormularioContacto.jsx`
- Modify: `src/app/globals.css` (estilos de la landing)

**Interfaces:**
- Produces: `enviarSolicitudContacto(_prevState, formData): Promise<{ok?: true, error?: string}>` (Server Action pública, limitada por IP).

- [ ] **Step 1: `src/app/actions/contacto.js`**

`'use server'`. Mismo patrón de límite por IP que `auth.js` (reusa `estaBloqueado`/`registrarIntento`/`limpiarIntentos` de `@/lib/ratelimit`). Valida que `nombre` y `correo` no estén vacíos (si lo están, `{ error: 'Completa nombre y correo.' }`). Inserta en `solicitudes_contacto` vía `crearClienteAdmin()` con `nombre, clinica, correo, telefono, mensaje`. Devuelve `{ ok: true }`.

- [ ] **Step 2: `src/app/FormularioContacto.jsx`**

`'use client'`. Mismo patrón que `admin/login/page.js` (`useActionState(enviarSolicitudContacto, {})`). Campos: nombre, clínica/institución, correo, teléfono, mensaje. Muestra `state.error` o un mensaje de éxito si `state.ok`.

- [ ] **Step 3: Reescribir `src/app/page.js`**

Server Component estático (sin llamadas a Supabase): portada (nombre + una frase), funcionalidades (lista fija: maniquí interactivo perro/gato, casos con descripción y video, varios casos activos con menú de selección, actualización en tiempo real), "para quién es" (clínicas, universidades, programas de formación), `<FormularioContacto />`, y un enlace `<a href="/admin/login">Iniciar sesión</a>`.

- [ ] **Step 4: Estilos en `src/app/globals.css`**

Reutilizar las variables/tonos ya definidos en el archivo para el resto de la app, no una paleta nueva.

- [ ] **Step 5: Verificar manualmente**

Visitar `/` → se ve la landing, no el simulador. Enviar el formulario con datos de prueba → mensaje de éxito y aparece una fila nueva en `solicitudes_contacto` (revisar por SQL Editor; el panel de "Solicitudes" es la Tarea 7). Enviar 6 veces seguidas desde el mismo origen → la 6ª se bloquea por el límite de intentos.

- [ ] **Step 6: `npm run build`**

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: landing page publica con formulario de contacto"
```

---

## Task 7: Panel de Solicitudes

**Files:**
- Modify: `src/app/actions/admin.js`
- Modify: `src/app/admin/AdminPanel.jsx`

**Interfaces:**
- Consumes: `requerirSuperAdmin()` (Tarea 2).
- Produces: `listarSolicitudes(): Promise<Array<{id,nombre,clinica,correo,telefono,mensaje,estado,creada_en}>>`, `actualizarEstadoSolicitud(id, estado): Promise<{solicitudes}>`.

- [ ] **Step 1: Helper interno + acciones públicas en `admin.js`**

```js
async function listarSolicitudesInterno(supabase) {
  const { data } = await supabase
    .from('solicitudes_contacto').select('*').order('creada_en', { ascending: false });
  return data || [];
}

export async function listarSolicitudes() {
  await requerirSuperAdmin();
  return listarSolicitudesInterno(crearClienteAdmin());
}

export async function actualizarEstadoSolicitud(id, estado) {
  await requerirSuperAdmin();
  const supabase = crearClienteAdmin();
  const valores = ['nueva', 'contactada', 'convertida', 'descartada'];
  if (!valores.includes(estado)) throw new Error('Estado inválido');
  await supabase.from('solicitudes_contacto').update({ estado }).eq('id', id);
  return { solicitudes: await listarSolicitudesInterno(supabase) };
}
```

(Mismo patrón que `leerTodo`: un helper interno sin chequeo de permiso, reusado por las funciones exportadas que sí lo chequean.)

- [ ] **Step 2: Incluir `solicitudes` en `leerDatosAdmin()` cuando `rol==='super_admin'`**

Evita una llamada aparte al cargar el panel: agregar `solicitudes: await listarSolicitudesInterno(supabase)` en la rama `super_admin` de `leerDatosAdmin` (Tarea 3, Step 3) — ahí ya hay un `supabase` creado y la sesión ya se verificó, así que se usa el helper interno directamente, sin pasar otra vez por `requerirSuperAdmin()`.

- [ ] **Step 3: `AdminPanel.jsx` — sección "Solicitudes"**

Visible solo si `datos.rol === 'super_admin'`, junto a la sección de Cuentas (Tarea 3). Lista cada solicitud con un `<select>` de estado que llama `actualizarEstadoSolicitud` y aplica el resultado con `setDatos`.

- [ ] **Step 4: Verificar manualmente**

Con 1-2 solicitudes de prueba (de la Tarea 6): la sección las muestra. Cambiar el estado de una a "contactada", recargar la página → el cambio se mantiene.

- [ ] **Step 5: `npm run build`**

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: panel de solicitudes de contacto"
```

---

## Task 8: Desplegar y migrar producción

**Files:** ninguno (tarea operativa).

- [ ] **Step 1:** Confirmar que las Tareas 1-7 se probaron de punta a punta en el proyecto de Supabase de PRUEBA (no producción).
- [ ] **Step 2:** Pushear la rama `cuentas-clientes` a `ecosimcyf/ecosim` y abrir un Pull Request contra `main` (sin `gh` CLI en este equipo: dar el enlace de compare `https://github.com/ecosimcyf/ecosim/compare/main...cuentas-clientes?expand=1`). Repetir las verificaciones manuales de las Tareas 2-7 en el preview de Vercel.
- [ ] **Step 3:** Correr la migración SQL de la Tarea 1 contra el proyecto de Supabase de PRODUCCIÓN desde el SQL Editor.
- [ ] **Step 4:** Confirmar en producción que los casos existentes quedaron con `cuenta_id='cuenta-demo'` y que `/c/demo` los muestra igual que antes del cambio.
- [ ] **Step 5:** Correr `scripts/crear-super-admin.mjs` contra producción para Pablo (y David, cuando esté listo), con contraseñas temporales. (Supabase Auth no tiene todavía un flujo de "cambiar mi propia contraseña" en el panel — anotado como posible mejora futura, no bloqueante.)
- [ ] **Step 6:** Fusionar el Pull Request a `main` (despliegue a producción).
- [ ] **Step 7:** Avisar a los estudiantes/usuarios actuales del nuevo enlace `/c/demo` — el viejo `/` ya no es el simulador. Incluir volver a "Añadir a la pantalla de inicio" en el móvil si lo habían hecho: el manifiesto (`src/app/manifest.js`, `start_url: '/'`) ahora abre la landing, no el simulador directamente.
- [ ] **Step 8:** Vigilar Supabase → Settings → Usage (storage/egress) las primeras semanas tras el lanzamiento.

---

## Self-Review

**Cobertura del spec:** cuentas/perfiles/roles (Tareas 1-3), rutas `/c/<slug>` y `/admin/login` único (Tareas 2, 5), migración de datos existentes (Tareas 1, 8), landing con funcionalidades + contacto + login (Tarea 6), panel de Solicitudes (Tarea 7), cupo de casos y de storage (Tareas 3-4), aviso del link viejo (Tarea 8). Las piezas marcadas "fuera de alcance" en el spec (maniquí realista, pasarela de pago, plantillas de casos, alertas automáticas, suite de pruebas) no tienen tarea — correcto, no debían tenerla.

**Consistencia de tipos:** `cuentaId` (string, id de `cuentas`) se usa con ese mismo nombre en los 3 archivos (`datos.js`, `admin.js`, `AdminPanel.jsx`/`VistaPrincipal.jsx`) y en las firmas de todas las acciones modificadas, sin alias distintos.

**Review Focus:** las 5 entradas tienen su paso de verificación explícito en la tarea que les corresponde (ver arriba, Steps 13 de la Tarea 3, Step 6 de la Tarea 4, Step 6 de la Tarea 5).

**Proporción:** 8 tareas para un spec de 3 piezas interdependientes (cuentas, landing, storage) — ninguna tarea transcribe más que las firmas y valores exactos que el spec fija; los cuerpos de función quedan para quien implemente.

---

## Execution Handoff

Plan completo y guardado en `docs/superpowers/plans/2026-10-26-cuentas-clientes-landing-storage.md`, en la rama `cuentas-clientes`. Por favor revísalo. ¿Qué enfoque de ejecución prefieres?

- **Subagent-driven** — un subagente nuevo implementa cada tarea y un revisor nuevo la revisa antes de pasar a la siguiente, más una revisión de toda la rama al final. Más minucioso; cuesta más contexto por tarea y por revisión.
- **Native** — implemento cada tarea yo mismo en esta sesión, y al final un revisor nuevo sobre el modelo más capaz revisa toda la rama. Más barato y rápido; sin revisión independiente hasta el final.

**Para este plan recomiendo Subagent-driven**, porque casi todas las tareas tocan aislamiento entre cuentas (quién puede ver o escribir qué) y ese es exactamente el tipo de error que una revisión fresca por tarea atrapa mejor que uno mismo revisando su propio código — y esto es una app que vas a vender, así que el costo extra vale la pena aquí. ¿El plan captura lo que quieres, y con qué enfoque seguimos?
