# Caninos y felinos — versión web

Versión web del simulador de ecografía EcoSim. Los estudiantes abren una URL
y ven un menú con los casos activos; al elegir uno, ven su maniquí y mantienen
presionado un punto para reproducir el video de esa ecografía. El profesor
administra casos, puntos y videos desde un panel protegido por contraseña, y
puede activar varios casos a la vez — el menú del estudiante se actualiza
solo cada 15 segundos en todas las pantallas.

- **Framework:** Next.js (App Router, JavaScript)
- **Datos, autenticación y videos:** Supabase (Postgres + Auth + Storage)
- **Alojamiento:** Vercel

---

## Antes de empezar

Necesitas tener instalado **Node.js 18 o superior**. Compruébalo con:

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

---

## Paso 3 — Configurar las variables de entorno

1. Copia el archivo `.env.local.example` y renombra la copia como `.env.local`.
2. Rellena los valores de Supabase del paso anterior.

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
- **Landing pública:** http://localhost:3000
- **Vista de una cuenta (lo que ve el estudiante):** http://localhost:3000/c/demo
  (`supabase/schema.sql` ya trae de ejemplo la cuenta `demo`)
- **Panel de administración:** http://localhost:3000/admin
  (entra con el correo y la contraseña del super_admin del Paso 4)

Flujo típico para probar:
1. Entra al panel, crea un caso, añade algún punto al maniquí y súbele un
   video `.mp4`.
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
   tienes en tu `.env.local` (las opcionales también, si las usas).
5. Pulsa **Deploy**. Vercel te dará una URL pública: esa es la que reparten
   los estudiantes.

---

## Cómo funciona (mapa rápido del código)

```
web/
├─ supabase/schema.sql             La base de datos (ejecútalo una vez en Supabase)
├─ scripts/crear-super-admin.mjs   Crea el primer super_admin (ver Paso 4)
├─ middleware.js                   Bloquea /admin si no has iniciado sesión
└─ src/
   ├─ app/
   │  ├─ page.js                   Landing pública ("/")
   │  ├─ c/[slug]/page.js          Resuelve el slug a su cuenta
   │  ├─ c/[slug]/VistaPrincipal.jsx  Vista del estudiante (maniquí, video, sondeo)
   │  ├─ admin/
   │  │  ├─ login/page.js          Pantalla de inicio de sesión
   │  │  ├─ cambiar-clave/page.js  Cambiar la propia contraseña
   │  │  ├─ page.js                Panel (carga de datos)
   │  │  └─ AdminPanel.jsx         Panel interactivo (cuentas, casos, puntos, videos)
   │  └─ actions/
   │     ├─ auth.js                Login / logout / cambiar contraseña
   │     ├─ admin.js               Guardar/leer cuentas, casos, puntos y videos
   │     └─ contacto.js            Formulario de contacto de la landing
   └─ lib/
      ├─ maniquies.js         El dibujo del perro y el gato (SVG)
      ├─ datos.js             Qué datos recibe el estudiante
      ├─ ratelimit.js         Límite de intentos de login y de contacto
      └─ supabase/            Conexiones a Supabase (navegador / servidor / admin)
```

### Ideas clave

- **El estudiante nunca recibe el nombre del punto** (sería una pista): lee la
  vista `puntos_publicos`, que no incluye el nombre.
- **Todas las escrituras pasan por el servidor** (Server Actions) detrás del
  check de sesión. El navegador del estudiante no puede modificar nada.
- **Los videos deben ser `.mp4` (H.264).** No se convierte ningún formato: si
  el archivo no es `.mp4`, se rechaza al elegirlo.
- **Qué casos están activos se refleja cada 15 segundos** en el menú del
  estudiante, por sondeo (no por Supabase Realtime: "casos" y "caso_videos"
  ya no tienen lectura directa para el rol anónimo — ver `supabase/schema.sql`
  — así que Realtime, que necesitaba esa misma lectura amplia, no puede
  avisar de cambios en esa tabla). Los videos de un caso solo se descargan
  cuando el estudiante lo abre desde el menú, nunca todos por adelantado.
