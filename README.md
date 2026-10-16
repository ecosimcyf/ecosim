# Caninos y felinos — versión web

Versión web del simulador de ecografía EcoSim. Los estudiantes abren una URL
y ven un menú con los casos activos; al elegir uno, ven su maniquí y mantienen
presionado un punto para reproducir el video de esa ecografía. El profesor
administra casos, puntos y videos desde un panel protegido por contraseña, y
puede activar varios casos a la vez — el menú del estudiante se actualiza en
tiempo real en todas las pantallas.

- **Framework:** Next.js (App Router, JavaScript)
- **Datos, videos y tiempo real:** Supabase (Postgres + Storage + Realtime)
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

---

## Paso 3 — Configurar las variables de entorno

1. Copia el archivo `.env.local.example` y renombra la copia como `.env.local`.
2. Rellena los valores de Supabase del paso anterior.
3. Genera el hash de la contraseña del admin y el secreto de la cookie:

   ```bash
   node scripts/generar-hash.mjs "la-contraseña-que-quieras"
   ```
   ```bash
   node scripts/generar-hash.mjs --secreto
   ```

   Pega el primer resultado en `ADMIN_PASSWORD_HASH` y el segundo en
   `ADMIN_SESSION_SECRET`.

> ⚠️ El archivo `.env.local` NUNCA se sube a internet (ya está protegido por
> `.gitignore`). Guárdalo solo en tu ordenador.

---

## Paso 4 — Probarlo en tu ordenador

```bash
npm run dev
```

Abre en el navegador:
- **Vista del estudiante:** http://localhost:3000
- **Panel de administración:** http://localhost:3000/admin
  (te pedirá la contraseña que elegiste en el paso 3)

Flujo típico para probar:
1. Entra al panel, crea un caso, añade algún punto al maniquí y súbele un
   video `.mp4`.
2. Pulsa **Activar** en ese caso.
3. Abre la vista del estudiante en otra pestaña: verás el maniquí. Mantén
   presionado un punto para reproducir su video.

---

## Paso 5 — Publicarlo en internet (Vercel)

1. Sube este proyecto a un repositorio de GitHub.
2. En [vercel.com](https://vercel.com): **Add New → Project** e importa el
   repositorio.
3. **Importante:** como la app está en la subcarpeta `web/`, en la
   configuración de Vercel pon **Root Directory = `web`**.
4. En **Environment Variables** de Vercel, añade las mismas variables que
   tienes en tu `.env.local`.
5. Pulsa **Deploy**. Vercel te dará una URL pública: esa es la que reparten
   los estudiantes.

---

## Cómo funciona (mapa rápido del código)

```
web/
├─ supabase/schema.sql        La base de datos (ejecútalo una vez en Supabase)
├─ scripts/generar-hash.mjs   Utilidad para el hash de la contraseña
├─ middleware.js              Bloquea /admin si no has iniciado sesión
└─ src/
   ├─ app/
   │  ├─ page.js              Vista del estudiante (carga inicial)
   │  ├─ VistaPrincipal.jsx   Vista del estudiante (maniquí, video, tiempo real)
   │  ├─ admin/
   │  │  ├─ login/page.js     Pantalla de contraseña
   │  │  ├─ page.js           Panel (carga de datos)
   │  │  └─ AdminPanel.jsx    Panel interactivo (casos, puntos, videos)
   │  └─ actions/
   │     ├─ auth.js           Login / logout
   │     └─ admin.js          Guardar/leer casos, puntos y videos
   └─ lib/
      ├─ maniquies.js         El dibujo del perro y el gato (SVG)
      ├─ datos.js             Qué datos recibe el estudiante
      ├─ session.js           La cookie de sesión del admin (firmada)
      ├─ ratelimit.js         Límite de intentos de login
      └─ supabase/            Conexiones a Supabase (navegador / servidor / admin)
```

### Ideas clave

- **El estudiante nunca recibe el nombre del punto** (sería una pista): lee la
  vista `puntos_publicos`, que no incluye el nombre.
- **Todas las escrituras pasan por el servidor** (Server Actions) detrás del
  check de sesión. El navegador del estudiante no puede modificar nada.
- **Los videos deben ser `.mp4` (H.264).** No se convierte ningún formato: si
  el archivo no es `.mp4`, se rechaza al elegirlo.
- **Qué casos están activos se propaga en tiempo real** gracias a Supabase
  Realtime sobre la tabla `casos`. Los videos de un caso solo se descargan
  cuando el estudiante lo abre desde el menú, nunca todos por adelantado.
