# Caninos y felinos — versión web

Versión web del simulador de ecografía EcoSim. Los estudiantes abren una URL
y ven un menú con los casos activos; al elegir uno, ven su maniquí y mantienen
presionado un punto para reproducir el video de esa ecografía. El profesor
administra casos, puntos y videos desde un panel protegido por contraseña, y
puede activar varios casos a la vez — el menú del estudiante se actualiza
solo cada 15 segundos en todas las pantallas.

- **Framework:** Next.js 15 (App Router, JavaScript)
- **Datos, autenticación y videos:** Supabase (Postgres + Auth + Storage)
- **Alojamiento:** Vercel

---

## Antes de empezar

Necesitas **Node.js 20 o superior** (los scripts usan `node --env-file`, que
pide 20.6+; el CI usa Node 22 y el desarrollo se hace con Node 24).
Compruébalo con:

```bash
node --version
```

Y dos cuentas gratuitas (te guío para crearlas más abajo):
- [supabase.com](https://supabase.com)
- [vercel.com](https://vercel.com)

---

## Paso 1 — Instalar las dependencias

Desde la carpeta `web/`:

```bash
npm install
```

---

## Paso 2 — Crear la base de datos en Supabase

1. Entra en [supabase.com](https://supabase.com) y crea un proyecto nuevo
   (elige una contraseña de base de datos y guárdala).
2. En el menú lateral: **SQL Editor → New query**.
3. Abre el archivo [`supabase/schema.sql`](supabase/schema.sql) de este
   proyecto, copia TODO su contenido, pégalo y pulsa **Run**.
   Esto crea las tablas, la vista pública, la seguridad y el "cubo" de videos.
4. En **Project Settings → API** copia estos tres valores (los usarás en el
   paso siguiente):
   - **Project URL**
   - **anon public** (clave pública)
   - **service_role** (clave secreta — trátala como una contraseña)
5. En **Authentication → Settings**, desactiva **"Allow new users to
   sign up"**. Las cuentas de cliente se crean solo desde el panel (ver
   Paso 4), nunca por registro libre: si se deja activado, cualquiera
   puede crear un usuario de Auth directo contra `/auth/v1/signup` con la
   clave anon pública. No vería datos de nadie (no tiene fila en
   `perfiles`: vería el aviso de "cuenta todavía no activa" al entrar),
   pero sí gasta tu cupo de correos de confirmación y deja cuentas
   huérfanas que hay que borrar a mano.

> **¿Ya tienes una base creada con una versión anterior?** No vuelvas a
> ejecutar `schema.sql`: ejecuta, **en este orden y una sola vez cada una**,
> las migraciones de [`supabase/`](supabase/) que te falten
> (todas son seguras de re-ejecutar):
>
> 1. `migracion-2026-10-28-revision.sql`
> 2. `migracion-2026-10-30-examenes.sql`
> 3. `migracion-2026-10-30-idiomas.sql`
> 4. `migracion-2026-11-04-revision.sql`
> 5. `migracion-2026-11-24-arreglos.sql` — **solo después** de desplegar
>    esta versión en Vercel (límites e intentos atómicos, reservas de cupo
>    atómicas, permisos). También cierra las funciones públicas viejas que la
>    versión anterior todavía usa (incluye lo de
>    `migracion-2026-11-04-cerrar-funciones-viejas.sql`, que ya no hace falta
>    ejecutar aparte). Mientras no se ejecute, esta versión funciona igual con
>    el comportamiento anterior.
>
> Los archivos `*-deshacer.sql` revierten la migración con ese nombre.

---

## Paso 3 — Configurar las variables de entorno

1. Copia el archivo `.env.local.example` y renombra la copia como `.env.local`.
2. Rellena los valores de Supabase del paso anterior.

| Variable | ¿Obligatoria? | Para qué |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Sí | Dirección del proyecto de Supabase. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sí | Clave pública (anon). |
| `SUPABASE_SERVICE_ROLE_KEY` | Sí | Clave secreta; solo se usa en el servidor. |
| `CRON_SECRET` | Sí en producción | Protege la tarea diaria `/api/cron/limpieza` (Vercel Cron, ver `vercel.json`). Cadena larga y aleatoria, la misma en Vercel. Sin ella la tarea no hace nada. |
| `RESEND_API_KEY`, `AVISO_SOLICITUDES_A` (y opcional `AVISO_SOLICITUDES_DE`) | No | Aviso por correo (Resend) cuando alguien llena el formulario de contacto. Sin ellas las solicitudes solo se ven en el panel. |
| `NEXT_PUBLIC_SITE_URL` | No | Dominio público (vista previa al compartir, sitemap). En Vercel se toma solo del dominio de producción. |

> ⚠️ El archivo `.env.local` NUNCA se sube a internet (ya está protegido por
> `.gitignore`). Guárdalo solo en tu ordenador.

---

## Paso 4 — Crear el primer super_admin

El panel no tiene registro libre (ver el paso 5 de "Crear la base de
datos" arriba): el primer usuario —el `super_admin`, que crea cuentas de
cliente y revisa las solicitudes de contacto— se crea desde la terminal,
no desde el navegador:

```bash
node --env-file=.env.local scripts/crear-super-admin.mjs correo@dominio.com "tu-contraseña"
```

Esto crea el usuario en Supabase Auth y su fila en `perfiles` con
`rol='super_admin'`. Repite el comando con otro correo si necesitas más de
un super_admin. Las cuentas de cliente (`rol='cliente'`) se crean después,
ya desde el propio panel ("Cuentas de clientes"), que te da una contraseña
temporal para pasarle al cliente en su primer ingreso — él la cambia desde
"Cambiar contraseña" en el panel.

---

## Paso 5 — Probarlo en tu ordenador

```bash
npm run dev
```

Abre en el navegador:
- **Landing pública:** http://localhost:3000 (se muestra en el idioma del
  navegador; también existen `/es`, `/pt` y `/en`) y su guía en `/guia`.
- **Vista de una cuenta (lo que ve el estudiante):** http://localhost:3000/c/demo
  (`supabase/schema.sql` ya trae de ejemplo la cuenta `demo`)
- **Panel de administración:** http://localhost:3000/admin
  (entra con el correo y la contraseña del super_admin del Paso 4)

Flujo típico para probar:
1. Entra al panel, crea un caso, añade algún punto al maniquí y súbele un
   video (si el navegador no lo reproduce, el panel lo convierte a H.264).
2. Activa ese caso (el interruptor en "Casos").
3. Abre `http://localhost:3000/c/demo` en otra pestaña: elige el caso en el
   menú y verás el maniquí. Mantén presionado un punto para reproducir su
   video.

---

## Paso 6 — Publicarlo en internet (Vercel)

1. Sube este proyecto a un repositorio de GitHub.
2. En [vercel.com](https://vercel.com): **Add New → Project** e importa el
   repositorio.
3. **Root Directory:** déjalo en la raíz. El repositorio de GitHub
   (`ecosimcyf/ecosim`) ES la app web: su `package.json` está en la raíz
   (la carpeta `web/` solo existe en el PC de desarrollo, junto a la app de
   escritorio).
4. En **Environment Variables** de Vercel, añade las mismas variables que
   tienes en tu `.env.local` (`CRON_SECRET` incluida; las opcionales también,
   si las usas).
5. Pulsa **Deploy**. Vercel te dará una URL pública: esa es la que reparten
   los estudiantes.
6. Después de cada despliegue, la prueba de humo (ver «Scripts»):
   `npm run humo -- https://<tu-dominio> <slug-de-una-cuenta>`.

---

## Scripts (`npm run ...`)

| Comando | Qué hace |
|---|---|
| `dev` / `build` / `start` | Servidor de desarrollo, compilar y servir lo compilado. |
| `test` | Pruebas automáticas (`tests/*.test.mjs`, con el probador de Node; sin red). |
| `respaldo` | Copia la base (JSON) y los archivos de Storage a `respaldos/`. Solo lee. Ver `docs/respaldo-y-restauracion.md`. |
| `restaurar` | Restaura un respaldo; por defecto es una simulación. Exige `--proyecto <ref>` (ver la guía de respaldos). |
| `prueba-carga` | Simula cientos de estudiantes abriendo una cuenta. Pega contra la base REAL: úsala con moderación. |
| `humo -- <url> [slug]` | Comprueba en segundos que las páginas clave responden bien tras un despliegue. |

`postinstall` copia el núcleo de ffmpeg.wasm desde `node_modules` a
`public/ffmpeg/` (esa carpeta no se versiona). La ruta `/api/salud` responde
200 si la web y la base contestan (para un monitor de disponibilidad).

---

## Cómo funciona (mapa rápido del código)

```
web/
├─ supabase/schema.sql             La base de datos completa (proyecto nuevo)
├─ supabase/migracion-*.sql        Cambios para bases ya existentes (ver Paso 2)
├─ scripts/                        crear-super-admin, respaldo, restaurar, prueba-carga, humo
├─ tests/                          Pruebas automáticas (npm test)
├─ docs/                           Checklist de producción y guía de respaldos
├─ vercel.json                     Tarea diaria de limpieza (cron)
└─ src/
   ├─ middleware.js                Reescribe "/", "/guia"... al idioma del visitante
   │                               y bloquea /admin si no has iniciado sesión
   ├─ app/
   │  ├─ (publico)/[idioma]/       Landing, guía, términos y privacidad: ESTÁTICAS
   │  │                            por idioma (/es, /pt, /en), servidas por el CDN
   │  ├─ (estudiante)/c/[slug]/    Vista del estudiante (maniquí, video, exámenes),
   │  │                            desde la caché del CDN (ISR de 60 s)
   │  ├─ (app)/admin/              Panel: login, cambiar contraseña, cuentas, casos,
   │  │                            puntos, videos y exámenes (AdminPanel.jsx)
   │  ├─ actions/                  Server Actions: auth, admin y contacto
   │  ├─ api/salud, api/cron/limpieza   Salud para el monitor y limpieza diaria
   │  ├─ landing/                  Piezas de las páginas públicas (cabecera, pie, formulario...)
   │  ├─ base.js                   Lo que comparten los dos layouts raíz
   │  └─ sitemap.js, robots.js, global-not-found.js
   └─ lib/
      ├─ i18n/                     Idiomas es/pt/en y textos/ (un archivo por zona)
      ├─ supabase/                 Conexiones a Supabase (navegador / servidor / admin)
      ├─ maniquies.js              El dibujo del perro y el gato (SVG)
      ├─ datos.js                  Qué datos recibe el estudiante
      ├─ limites.js, ratelimit.js  Límites de intentos (login, contacto, cupos), en la base
      ├─ convertir-video.js        Conversión a H.264 con ffmpeg.wasm (en el navegador)
      └─ limpieza.js, correo.js, validar.js ...
```

### Ideas clave

- **El estudiante nunca recibe el nombre del punto** (sería una pista): lee la
  vista `puntos_publicos`, que no incluye el nombre.
- **Todas las escrituras pasan por el servidor** (Server Actions) detrás del
  check de sesión. El navegador del estudiante no puede modificar nada.
- **Videos:** el panel acepta varios formatos. Si el navegador no puede
  reproducir el archivo (p. ej. MPEG-4 Parte 2 de algunos ecógrafos), se
  convierte a MP4/H.264 con ffmpeg.wasm **en el propio navegador** antes de
  subirlo. Máximo **30 segundos** y **50 MB** por video; en Storage solo
  entra MP4.
- **Límites de intentos y cupos** (login, contacto, reservas de subida) se
  guardan en la base (tablas `intentos` y `subidas_pendientes`), así valen
  igual con varios servidores. La tarea diaria de limpieza borra lo vencido.
- **Páginas públicas estáticas:** el middleware las reescribe por dentro a
  `/es`, `/pt` o `/en` según la cookie `idioma` o el idioma del navegador;
  los enlaces de esas páginas llevan ya el prefijo de idioma (lo que ven los
  buscadores, con `hreflang`).
- **Qué casos están activos se refleja cada 15 segundos** en el menú del
  estudiante, por sondeo (no por Supabase Realtime: "casos" y "caso_videos"
  ya no tienen lectura directa para el rol anónimo — ver `supabase/schema.sql`
  — así que Realtime, que necesitaba esa misma lectura amplia, no puede
  avisar de cambios en esa tabla). Los videos de un caso solo se descargan
  cuando el estudiante lo abre desde el menú, nunca todos por adelantado.
- **Errores:** los del servidor no se guardan en la base: se consultan en el
  registro (Logs) de Vercel.
