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
- Alguien con la clave `anon` (pública, extraíble del JS del navegador) consulta `casos`/`caso_videos` por `select` directo vía REST, sin pasar por `/c/<slug>` — debe fallar por falta de permiso; solo las 3 funciones RPC (scoped por cuenta) pueden leerlos. Hallazgo real de la Tarea 3 sobre código previo a este plan, cerrado ampliando la Tarea 5. → Tarea 5.

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
- Modify: `src/app/admin/AdminPanel.jsx`

(`src/app/admin/page.js` no necesita cambios: ya reenvía el objeto `datos` completo a `AdminPanel` sin leer campos específicos, así que simplemente recibe más campos sin tocarse.)

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

Incluir `usoStorageMb` (resultado de `usoStorageBytes` dividido entre 1024*1024, redondeado) en lo que devuelven `leerDatosAdmin`/`elegirCuentaAdmin` (Tarea 3), y mostrarlo junto al cupo de casos en `AdminPanel.jsx`: "Storage: X / Y MB". En la rama de `leerDatosAdmin` donde `rol==='super_admin'` y todavía no se eligió cuenta (`cuentaId: null`), `usoStorageMb` va en `null` igual que `cupoCasosPropios` — no corresponde calcularlo sin una cuenta elegida.

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

> **Ampliado el 2026-10-26, antes de dispatchear esta tarea:** el implementador de la Tarea 3 encontró que las policies públicas de `casos`/`caso_videos` (de antes de este plan) dejan a CUALQUIERA con la clave `anon` (pública por diseño, va en el JS del navegador) leer, por la REST API de Supabase directa — sin pasar por esta app — los casos activos de TODAS las cuentas a la vez; para `caso_videos` ni siquiera hace falta que el caso esté activo. El usuario confirmó cerrarlo del todo: en vez de que el público lea `casos`/`caso_videos` por `select` directo, lee por 3 funciones RPC nuevas que filtran por cuenta adentro, y se revoca el `select` directo a esas 2 tablas. Costo aceptado: se pierde el push instantáneo de Realtime (que necesitaba ese mismo acceso amplio); queda el sondeo de 15s que ya existía como respaldo, así que el menú del estudiante se sigue actualizando solo, con hasta 15s de atraso.

**Files:**
- Modify: `supabase/schema.sql` (3 funciones RPC + revocar grants, bloque de migración nuevo — Task 1 ya está cerrada, esto no la reabre)
- Modify: `src/lib/datos.js`
- Create: `src/app/c/[slug]/page.js`
- Move: `src/app/VistaPrincipal.jsx` → `src/app/c/[slug]/VistaPrincipal.jsx`

**Interfaces:**
- Produces: `resolverCuenta(supabase, slug): Promise<{id,slug,nombre,activa}|null>` (sigue leyendo `cuentas_publicas` por `select` directo — esa vista no cambia, no expone nada sensible por cuenta).
- Modifica firmas: `listarCasosActivos(supabase, cuentaId)`, `cargarDatosDeCaso(supabase, casoId, cuentaId)` — mismas firmas que antes, pero ahora implementadas con `.rpc(...)` en vez de `.from(...).select(...)`.

- [ ] **Step 0: Migración SQL — funciones RPC + revocar acceso directo**

Agregar a `supabase/schema.sql`:

```sql
-- ============================================================
-- MIGRACIÓN (2026-10-26): lectura pública de casos/caso_videos solo por
-- función (cierra la lectura directa por REST, que no filtraba por cuenta)
-- ------------------------------------------------------------
create or replace function casos_activos_de_cuenta(p_cuenta_id text)
returns table (id text, nombre text, descripcion text, especie text)
language sql security definer set search_path = public
as $$
  select c.id, c.nombre, c.descripcion, c.especie
  from casos c
  join cuentas cu on cu.id = c.cuenta_id
  where c.cuenta_id = p_cuenta_id and cu.activa and c.activo
  order by c.nombre;
$$;
grant execute on function casos_activos_de_cuenta(text) to anon, authenticated;

create or replace function caso_publico(p_cuenta_id text, p_caso_id text)
returns table (id text, nombre text, especie text)
language sql security definer set search_path = public
as $$
  select c.id, c.nombre, c.especie
  from casos c
  join cuentas cu on cu.id = c.cuenta_id
  where c.cuenta_id = p_cuenta_id and cu.activa and c.activo and c.id = p_caso_id;
$$;
grant execute on function caso_publico(text, text) to anon, authenticated;

create or replace function videos_de_caso_publico(p_cuenta_id text, p_caso_id text)
returns table (punto_id text, video_url text)
language sql security definer set search_path = public
as $$
  select cv.punto_id, cv.video_url
  from caso_videos cv
  join casos c on c.id = cv.caso_id
  where c.cuenta_id = p_cuenta_id and c.id = p_caso_id and c.activo;
$$;
grant execute on function videos_de_caso_publico(text, text) to anon, authenticated;

-- Esto es lo que de verdad cierra el hueco: antes, cualquiera con la clave
-- anon podía pedir TODOS los casos de TODAS las cuentas por `/rest/v1/casos`
-- directo. Ahora solo se puede pedir "los de esta cuenta" vía las funciones
-- de arriba. puntos_publicos y cuentas_publicas NO cambian (sin dato
-- sensible por cuenta en ninguna de las dos).
drop policy if exists "casos lectura publica" on casos;
drop policy if exists "caso_videos lectura publica" on caso_videos;
revoke select on casos from anon, authenticated;
revoke select on caso_videos from anon, authenticated;
```

- [ ] **Step 1: `resolverCuenta(supabase, slug)` en `src/lib/datos.js`**

```js
export async function resolverCuenta(supabase, slug) {
  const { data } = await supabase
    .from('cuentas_publicas').select('id,slug,nombre,activa').eq('slug', slug).maybeSingle();
  return data || null;
}
```

- [ ] **Step 2: Reescribir `listarCasosActivos(supabase, cuentaId)` para usar la función RPC**

```js
export async function listarCasosActivos(supabase, cuentaId) {
  const { data } = await supabase.rpc('casos_activos_de_cuenta', { p_cuenta_id: cuentaId });
  return data || [];
}
```

- [ ] **Step 3: Reescribir `cargarDatosDeCaso(supabase, casoId, cuentaId)` para usar las funciones RPC**

Paso 1 (traer el caso): `const { data: filas } = await supabase.rpc('caso_publico', { p_cuenta_id: cuentaId, p_caso_id: casoId }); const caso = filas?.[0];` — si no hay fila, sigue devolviendo `{ casoId: null }` igual que hoy. Paso 2 (`puntos_publicos`): sin cambios, sigue siendo `select` directo. Paso 3 (videos): `const { data: videos } = await supabase.rpc('videos_de_caso_publico', { p_cuenta_id: cuentaId, p_caso_id: casoId });` en vez del `select` a `caso_videos`. El resto de la función (armar `mapa`/`lista`) no cambia.

- [ ] **Step 4: Mover `VistaPrincipal.jsx` a `src/app/c/[slug]/VistaPrincipal.jsx`, quitar la suscripción de Realtime**

Añadir una prop `cuentaId`. Pasarla en las 2 llamadas del lado del cliente que hoy llaman a `listarCasosActivos`/`cargarDatosDeCaso` (en `abrirCaso` y en `recargarLista`, dentro del efecto de tiempo real). **Quitar la suscripción `supabase.channel('casos-cambios').on('postgres_changes', ...)`** del efecto de tiempo real (ya no recibiría nada: `casos` perdió su grant directo de lectura para `anon`) — dejar SOLO el `setInterval(recargarLista, 15000)` que ya existe como respaldo, sin canal que crear ni limpiar. Actualizar el comentario del efecto para explicar que ahora el sondeo de 15s es el único mecanismo, no un respaldo del canal.

- [ ] **Step 5: Crear `src/app/c/[slug]/page.js`**

Server Component: `const { slug } = await params;`; `crearClienteServidor()`; `const cuenta = await resolverCuenta(supabase, slug);`; si `!cuenta || !cuenta.activa` → renderizar un aviso simple ("Este enlace no está disponible. Contacta a tu asesor.") en vez de `VistaPrincipal`; si no, `const casosActivosIniciales = await listarCasosActivos(supabase, cuenta.id);` y renderizar `<VistaPrincipal casosActivosIniciales={casosActivosIniciales} cuentaId={cuenta.id} />`. Mantener `export const dynamic = 'force-dynamic'`.

- [ ] **Step 6: Verificar manualmente**

Con una cuenta de prueba con 1-2 casos activos (de la Tarea 3): visitar `/c/<su-slug>` → el menú muestra solo esos casos. Visitar `/c/slug-que-no-existe` → aviso genérico. Poner `activa=false` a mano en SQL y recargar → mismo aviso genérico — caso de Review Focus. Activar/desactivar un caso desde el panel se refleja en esta ruta en máximo ~15s (ya no al instante — cambio aceptado, ver nota de arriba). **Nuevo, importante:** con el proyecto de prueba de la Tarea 8, confirmar que la clave `anon` YA NO puede leer `casos`/`caso_videos` por `select` directo (debe dar error de permiso vía `curl` o el Table Editor de Supabase), solo por las 3 funciones RPC.

(`src/app/page.js` queda SIN tocar en esta tarea — sigue mostrando el simulador global viejo hasta la Tarea 6. Así ambas rutas conviven sin romper nada mientras se prueba.)

- [ ] **Step 7: `npm run build`**

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: ruta publica /c/[slug] por cuenta, lectura via RPC"
```

---

## Task 6: Landing page en `/` + formulario de contacto

> **Nota de la Tarea 5:** `src/app/VistaPrincipal.jsx` (el archivo viejo, global) sigue existiendo — la Tarea 5 copió su versión por-cuenta a `src/app/c/[slug]/VistaPrincipal.jsx` en vez de moverlo, porque moverlo habría roto el import de `src/app/page.js` antes de que esta tarea lo reescribiera. Esta tarea, al reemplazar `page.js`, debe BORRAR el `src/app/VistaPrincipal.jsx` viejo (queda huérfano, nadie más lo importa).

**Files:**
- Modify: `src/app/page.js` (se reemplaza por completo)
- Delete: `src/app/VistaPrincipal.jsx` (huérfano desde la Tarea 5, ver nota arriba)
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

Server Component estático (sin llamadas a Supabase): portada (nombre + una frase), funcionalidades (lista fija: maniquí interactivo perro/gato, casos con descripción y video, varios casos activos con menú de selección, actualización automática cuando el profesor activa/desactiva un caso — decir "automática", no "en tiempo real": desde la Tarea 5 es por sondeo cada 15s, no instantáneo), "para quién es" (clínicas, universidades, programas de formación), `<FormularioContacto />`, y un enlace `<a href="/admin/login">Iniciar sesión</a>`. Borrar `src/app/VistaPrincipal.jsx` (ver nota al inicio de esta tarea) como parte de este mismo paso.

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

## Task 8: Arreglos de la revisión final de rama

> **Por qué existe esta tarea:** la revisión final de toda la rama (tras las Tareas 1-7, todas individualmente aprobadas) encontró 2 problemas Critical y varios Important que ninguna revisión de tarea aislada podía ver, porque cada una solo veía su propio diff. El usuario ya resolvió las 3 decisiones de producto que esto requería (ver cada fix abajo). Esta tarea cierra todo antes de desplegar — la Tarea 9 (antes Tarea 8) es el despliegue en sí.

**Files:**
- Modify: `src/app/actions/admin.js` (fixes 1, 3, 4, 5)
- Modify: `src/app/actions/auth.js` (fix 2: nueva acción `cambiarContrasena`; fix 7: prefijo del rate-limit)
- Modify: `src/app/actions/contacto.js` (fix 7: prefijo del rate-limit)
- Create: `src/app/admin/cambiar-clave/page.js` (fix 2)
- Modify: `src/app/admin/page.js` (fix 2: link a "Cambiar contraseña" junto a "Cerrar sesión"; fix de regalo — Minor #16 de la revisión: si el usuario autenticado no tiene fila en `perfiles`, mostrar un aviso claro en vez de que la página reviente)
- Modify: `src/app/admin/AdminPanel.jsx` (fixes 2, 3: mostrar la clave temporal una vez; adaptar los call-sites que ahora pueden recibir `{error}`)
- Modify: `src/lib/datos.js` (fix 6: `resolverCuenta` usa la función nueva)
- Modify: `supabase/schema.sql` (fix 6: nueva función `cuenta_por_slug`, se quita la vista `cuentas_publicas`)
- Modify: `README.md`, `.env.local.example` (fix 8)

**Interfaces:**
- Modifica: `crearCuenta(...)` ahora devuelve `{ cuentas, claveTemporal }` en éxito, o `{ error }` en vez de `throw` para fallos esperables (slug duplicado, fallo al crear el usuario).
- Modifica: `crearCaso(...)` y `crearUrlSubidaVideo(...)` devuelven `{ error }` en vez de `throw` solo para el mensaje de cupo (el `throw` de "No autorizado" por permiso NO cambia — sigue igual en estas y en todas las demás funciones).
- Produces: `cambiarContrasena(_prevState, formData): Promise<{ok?: true, error?: string}>` en `auth.js`.
- Produces: `resolverCuenta(supabase, slug)` ahora vía `.rpc('cuenta_por_slug', ...)` en vez de `.from('cuentas_publicas')`.

- [ ] **Step 1 (fix Critical #1 — un cliente puede borrar el video de otra cuenta pasando el `path` de otra cuenta):**

  En `crearUrlSubidaVideo`, cambiar `const path = randomUUID() + '.mp4';` por `const path = cuentaId + '/' + randomUUID() + '.mp4';` (el path ahora empieza con la cuenta dueña).

  En `guardarVideoCaso(cuentaId, casoId, puntoId, path, tamanoBytes)`, después del chequeo de pertenencia del `casoId` que ya existe, agregar: `if (!path.startsWith(cuentaId + '/')) throw new Error('No autorizado');` — un `path` que no empiece con la cuenta del que llama se rechaza, sin importar qué `casoId` haya pasado. Los videos viejos (subidos antes de este fix, sin el prefijo) siguen funcionando para LEER — este chequeo solo bloquea subir/reemplazar con un path ajeno, no rompe nada existente.

- [ ] **Step 2 (fix Critical #2 — un cliente invitado nunca puede iniciar sesión; decisión del usuario: contraseña temporal):**

  En `crearCuenta`, cambiar el orden y el mecanismo: (1) generar `const tempPassword = randomUUID().replace(/-/g, '').slice(0, 12);`, (2) crear el usuario PRIMERO con `supabase.auth.admin.createUser({ email: correo.trim(), password: tempPassword, email_confirm: true })` (ya no `inviteUserByEmail` — no depende de correo saliente ni de configurar SMTP), (3) solo si eso funciona, insertar la fila en `cuentas`, (4) solo si eso funciona, insertar en `perfiles`. Revisar el error de CADA paso y devolver un `{ error }` claro y específico si falla — si falla el paso 3 o 4 después de que el paso 2 ya creó el usuario, decirlo explícitamente en el mensaje (p. ej. "...el usuario ya se creó con ese correo; bórralo desde Supabase si no vas a reintentar"). Si todo sale bien, devolver `{ cuentas: await listarCuentasInterno(supabase), claveTemporal: tempPassword }`.

  En `AdminPanel.jsx`, el handler que llama `crearCuenta` muestra la clave temporal una sola vez (p. ej. `alert('Cuenta creada. Contraseña temporal para ' + correo + ': ' + r.claveTemporal + ' — cópiala y pásasela al cliente, no se vuelve a mostrar.')`) antes de fusionar el resto del resultado al estado.

  Crear `src/app/actions/auth.js` → `cambiarContrasena(_prevState, formData)`: lee `nueva` del formData, exige mínimo 8 caracteres (si no, `{ error: 'La contraseña debe tener al menos 8 caracteres.' }`), llama `crearClienteServidorAuth().auth.updateUser({ password: nueva })`, devuelve `{ error }` o `{ ok: true }`.

  Crear `src/app/admin/cambiar-clave/page.js`: página cliente con `useActionState(cambiarContrasena, {})`, mismo patrón visual que `admin/login/page.js` — un campo de contraseña nueva, botón, mensaje de error o de éxito. Ya queda protegida por el middleware existente (el matcher ya cubre `/admin/:path*`). Esto también resuelve lo que la Tarea 9 (antes 8) Step 5 marcaba como "no bloqueante": ahora CUALQUIER admin (super_admin incluido) puede cambiar su propia contraseña temporal.

  En `src/app/admin/page.js`, agregar un link "Cambiar contraseña" hacia `/admin/cambiar-clave` junto al botón "Cerrar sesión". De paso (hallazgo Minor #16 de la revisión): si `leerDatosAdmin()` falla porque el usuario autenticado no tiene fila en `perfiles` (cuenta a medio crear, ver el manejo de errores del Step 2), mostrar un mensaje claro ("Tu cuenta todavía no está activa. Contacta a tu asesor.") en vez de dejar que la página reviente con un error de servidor sin manejar.

- [ ] **Step 3 (fix Important #3 — en producción, los mensajes de cupo/error se reemplazan por un genérico en inglés):**

  Next.js oculta el mensaje real de cualquier `Error` lanzado desde una Server Action en el build de producción (solo se ve completo en `next dev`— por eso ninguna revisión de tarea lo notó). Cambiar, SOLO para los mensajes que el usuario debe poder leer (cupo de casos, cupo de storage, los errores de `crearCuenta` del Step 2): en vez de `throw new Error('Llegaste al límite...')`, hacer `return { error: 'Llegaste al límite...' }`. **No tocar** los `throw new Error('No autorizado')` de permiso — esos quedan igual a propósito (no son mensajes que el usuario normal deba ver).

  Afectado en `admin.js`: el bloque de cupo dentro de `crearCaso`, el bloque de cupo dentro de `crearUrlSubidaVideo` (más lo que agrega el Step 4 de abajo), y los errores de `crearCuenta` (Step 2).

  En `AdminPanel.jsx`, los 3 handlers que llaman a estas funciones (`crear()` para `crearCaso`, el handler de subida para `crearUrlSubidaVideo`/`guardarVideoCaso`, y el nuevo handler de `crearCuenta` del Step 2) deben revisar `if (resultado.error) { alert(resultado.error); return; }` ANTES de fusionar el resultado al estado — igual que ya hace `FormularioContacto.jsx` con `state.error`.

- [ ] **Step 4 (fix Important #4 — el cupo de storage confía en el tamaño que manda el navegador, sin verificarlo):**

  En `guardarVideoCaso`, después de confirmar que el `casoId`/`path` son del que llama (Steps 1 y ya existente) pero ANTES de guardar la fila: pedir el tamaño REAL del archivo ya subido con `const { data: info } = await supabase.storage.from(BUCKET).info(path);` y usar `info?.size` (si está disponible) en vez de confiar en el `tamanoBytes` que mandó el navegador. Si `rol === 'cliente'`, volver a comparar ese tamaño real contra el cupo restante (mismo cálculo que ya hace `crearUrlSubidaVideo`, pero con el número de verdad); si se pasa, borrar el archivo recién subido (`borrarVideosStorage`) y devolver `{ error: 'Llegaste al límite de almacenamiento de tu plan. Contacta a tu asesor para ampliarlo.' }` en vez de guardar la fila. Guardar siempre `tamano_bytes` con el tamaño REAL (de `info`), no el que mandó el navegador.

- [ ] **Step 5 (fix Important #5 — comentario engañoso; decisión del usuario: el cupo es total, como ya hace el código):**

  El código de `crearCaso` ya cuenta TODOS los casos de la cuenta (propios + precargados por el equipo) contra `cupo_casos_propios` — eso es lo correcto, confirmado con el usuario. Solo corregir el comentario que dice lo contrario (algo como "el cupo limita lo que crea el cliente, no lo que el equipo precarga") para que diga que el cupo es total: cuántos casos puede tener la cuenta en total, sin importar quién los creó.

- [ ] **Step 6 (fix Important #6 — `cuentas_publicas` deja ver el listado completo de clientes; decisión del usuario: cerrarlo):**

  En `supabase/schema.sql`, agregar:

  ```sql
  create or replace function cuenta_por_slug(p_slug text)
  returns table (id text, slug text, nombre text, activa boolean)
  language sql security definer set search_path = public
  as $$
    select id, slug, nombre, activa from cuentas where slug = p_slug;
  $$;
  grant execute on function cuenta_por_slug(text) to anon, authenticated;

  drop view if exists cuentas_publicas;
  ```

  (Al borrar la vista se van también sus permisos — no hace falta un `revoke` aparte.)

  En `src/lib/datos.js`, reescribir `resolverCuenta`:

  ```js
  export async function resolverCuenta(supabase, slug) {
    const { data } = await supabase.rpc('cuenta_por_slug', { p_slug: slug });
    return data?.[0] || null;
  }
  ```

  Nadie más usa `cuentas_publicas` directamente (confirmar con grep antes de borrar la vista).

- [ ] **Step 7 (fix Important #7 — el límite de intentos del login y el del formulario de contacto comparten el mismo contador por IP):**

  En `src/app/actions/auth.js` (`login`), cambiar las 3 llamadas (`estaBloqueado`, `registrarIntento`, `limpiarIntentos`) para usar `'login:' + ip` en vez de `ip` solo. En `src/app/actions/contacto.js` (`enviarSolicitudContacto`), usar `'contacto:' + ip`. No hace falta tocar `ratelimit.js` — ya recibe la clave como string, solo cambia qué string le mandan.

- [ ] **Step 8 (fix Important #8 — README y .env.local.example desactualizados; el revisor final pide que esto bloquee el merge, no que quede diferido):**

  Actualizar `README.md`: quitar las instrucciones de generar `ADMIN_PASSWORD_HASH`/`ADMIN_SESSION_SECRET`; agregar que el primer super_admin se crea con `node --env-file=.env.local scripts/crear-super-admin.mjs <correo> <contraseña>`; cambiar cualquier referencia a que los estudiantes entran por `/` (ahora es `/c/<slug>`) y a que el menú se actualiza "en tiempo real" (ahora cada 15s); quitar referencias a archivos que ya no existen (`src/lib/session.js`, `src/app/VistaPrincipal.jsx` en su ubicación vieja). Agregar una sección breve sobre configuración de Supabase Auth necesaria: desactivar "Allow new users to sign up" en Authentication → Settings (si no, cualquiera podría registrarse directo contra `/auth/v1/signup` con la clave anon — no obtendría datos, pero consume el cupo de correos y puede hacer fallar el panel de un usuario sin perfil, ver Step 2).

  Actualizar `.env.local.example`: quitar `ADMIN_PASSWORD_HASH`/`ADMIN_SESSION_SECRET` (ya no los lee nada).

- [ ] **Step 9: `npm run build`**

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "fix: arreglos de la revision final de rama (critical + important)"
```

---

## Task 9: Desplegar y migrar producción

> **Orden corregido tras la revisión final de rama:** el orden original (migrar todo, después mergear) tenía una ventana real: en cuanto se revocara el acceso directo a `casos`/`caso_videos` (parte de la migración de la Tarea 5), la versión VIEJA de `/` —todavía desplegada en ese momento, que lee esas tablas directo— mostraría el menú vacío a cualquier estudiante que entrara en esa ventana. El orden de abajo lo evita: las funciones RPC se crean ANTES de desplegar (aditivo, no rompe nada viejo), y el acceso directo se revoca RECIÉN DESPUÉS de confirmar que el código nuevo ya está en producción.

**Files:** ninguno (tarea operativa).

- [ ] **Step 1:** Confirmar que las Tareas 1-8 se probaron de punta a punta en el proyecto de Supabase de PRUEBA (no producción).
- [ ] **Step 2:** Pushear la rama `cuentas-clientes` a `ecosimcyf/ecosim` y abrir un Pull Request contra `main` (sin `gh` CLI en este equipo: dar el enlace de compare `https://github.com/ecosimcyf/ecosim/compare/main...cuentas-clientes?expand=1`). Repetir las verificaciones manuales de las Tareas 2-8 en el preview de Vercel — con un build de PRODUCCIÓN real (el preview de Vercel ya lo es), no `next dev`, porque el fix del Step 3 de la Tarea 8 (mensajes de error) solo se puede confirmar así.
- [ ] **Step 3:** Contra el proyecto de Supabase de PRODUCCIÓN, desde el SQL Editor, en este orden:
  1. La migración completa de la Tarea 1 (tablas `cuentas`/`perfiles`, `casos.cuenta_id`, etc.), **agregando además** `alter table casos alter column cuenta_id set default 'cuenta-demo';` al final (no estaba en la Tarea 1 — es un respaldo temporal para esta ventana de despliegue, se quita en el Step 7).
  2. Solo la parte de CREACIÓN de la migración de la Tarea 5 (las 3 funciones `casos_activos_de_cuenta`/`caso_publico`/`videos_de_caso_publico` + sus `grant execute`) y la función nueva `cuenta_por_slug` + `grant execute` de la Tarea 8 — **sin** correr todavía los `drop policy`/`revoke select`/`drop view` de esas mismas migraciones. Esto es aditivo: el código viejo (que todavía lee las tablas directo) sigue funcionando exactamente igual, y dejas listas las funciones que el código nuevo va a necesitar apenas se despliegue.
- [ ] **Step 4:** Confirmar en producción que los casos existentes quedaron con `cuenta_id='cuenta-demo'` y que `/c/demo` los muestra igual que antes del cambio.
- [ ] **Step 5:** Correr `scripts/crear-super-admin.mjs` contra producción para Pablo (y David, cuando esté listo) — con la Tarea 8 ya hecha, pueden cambiar esa contraseña temporal ellos mismos desde `/admin/cambiar-clave` en su primer ingreso.
- [ ] **Step 6:** Fusionar el Pull Request a `main` (despliegue a producción) — ahora sí es seguro: las funciones que el código nuevo necesita ya existen (Step 3.2), y el acceso directo todavía no se revocó, así que no hay ventana donde nada funcione.
- [ ] **Step 7:** Una vez confirmado que `main` está desplegado y `/c/demo` funciona con el código nuevo: correr el resto de las migraciones de las Tareas 5 y 8 que quedó pendiente — `drop policy`/`revoke select` sobre `casos`/`caso_videos`, `drop view cuentas_publicas` — y recién ahí quitar el respaldo temporal: `alter table casos alter column cuenta_id drop default;`. Esto es lo que de verdad cierra el hueco de seguridad que motivó la Tarea 5 — no quedó cerrado hasta este paso.
- [ ] **Step 8:** Avisar a los estudiantes/usuarios actuales del nuevo enlace `/c/demo` — el viejo `/` ya no es el simulador. Incluir volver a "Añadir a la pantalla de inicio" en el móvil si lo habían hecho: el manifiesto (`src/app/manifest.js`, `start_url: '/'`) ahora abre la landing, no el simulador directamente.
- [ ] **Step 9:** Vigilar Supabase → Settings → Usage (storage/egress) las primeras semanas tras el lanzamiento.

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
