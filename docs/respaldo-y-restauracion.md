# Respaldo y restauración — EcoSim web

Los backups de Supabase solo guardan la **base de datos** (y en el plan gratis, ni eso). Los **videos y exámenes** de Storage no tenían copia en ningún lado. Estos scripts cubren las dos cosas.

## Hacer un respaldo

Desde la carpeta `web/`:

```bash
npm run respaldo
```

- Guarda una **foto de la base** en `respaldos/base/<fecha>/`. Son todas las tablas en JSON, más la lista de administradores, sin contraseñas.
- Copia **todos los archivos** de Storage en `respaldos/archivos/videos/` y `respaldos/archivos/examenes/`. La primera vez lo baja todo (≈ 75 MB en noviembre de 2026); las siguientes, solo lo nuevo.
- Solo **lee** de Supabase: nunca cambia ni borra nada allí.
- `npm run respaldo -- --sin-archivos` respalda solo la base (segundos).
- `npm run respaldo -- --destino "D:\Respaldos\EcoSim"` guarda en otra carpeta, por ejemplo un disco externo.

**Cada cuánto:** una vez por semana, y siempre antes de una migración SQL o de mezclar una rama grande.

**Dónde guardarlo:** la carpeta `respaldos/` tiene datos de **todos los clientes**. Git la ignora, pero cópiala a un lugar privado que no sea este PC, como un disco externo o tu Google Drive personal. No la compartas.

## Restaurar

Primero, siempre, en **simulación** (no cambia nada, solo cuenta lo que haría):

```bash
npm run restaurar -- --base respaldos/base/2026-11-05_12-59
```

Si lo que muestra es lo esperado, de verdad:

```bash
npm run restaurar -- --base respaldos/base/2026-11-05_12-59 --confirmar
```

- **Archivos:** sube a Storage los que faltan. Nunca pisa uno que ya exista.
- **Base:** inserta o actualiza las filas tabla por tabla, en orden (cuentas, puntos, casos, videos, exámenes…). **No borra nada.**
- **Administradores:** las contraseñas no se respaldan. Si un usuario de Auth se perdió:
  1. Créalo otra vez con el mismo correo (panel → Cuentas, o `scripts/crear-super-admin.mjs`).
  2. Restablécele la contraseña desde el panel.
  3. Vuelve a ejecutar la restauración para que se recupere su perfil.
- `--solo-archivos` o `--solo-base` restauran solo una de las dos partes.

## Si se pierde TODO el proyecto de Supabase

1. Crear un proyecto nuevo de Supabase y ejecutar `supabase/schema.sql` en el SQL Editor.
2. Crear los buckets `videos` y `examenes`, públicos, como en `schema.sql`.
3. Poner las claves nuevas en `.env.local` y en Vercel.
4. `npm run restaurar -- --base <la foto más reciente> --confirmar`.
5. Las URL de los videos guardadas en la base apuntan al proyecto **viejo**. Hay que cambiarlas al nuevo con este SQL (reemplaza los dos dominios):

   ```sql
   update caso_videos set video_url = replace(video_url, 'https://VIEJO.supabase.co', 'https://NUEVO.supabase.co');
   update caso_archivos set url = replace(url, 'https://VIEJO.supabase.co', 'https://NUEVO.supabase.co');
   ```
