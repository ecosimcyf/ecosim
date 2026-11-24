# Checklist de producción — EcoSim web

- **Auditoría:** 2026-11-05. **Puesta al día:** 2026-11-24.
- **Rama:** `actualizacion-2026-11`, **todavía sin mezclar a `main`**. Todo lo marcado ✅ aquí está en esa rama y llega a producción cuando se mezcle.
- **No incluido en esta versión:** el código de acceso de los estudiantes, la verificación en dos pasos (2FA) y el registro de errores en la base (pestaña «Errores» y aviso por correo). Los errores del servidor van al registro (Logs) de Vercel. El aviso por correo de las solicitudes de contacto (Resend) sí sigue.
- **Objetivo:** que la web aguante clases, conferencias y picos de tráfico sin fallar delante de la gente.

**Leyenda:** ✅ cumple · ⚠️ a medias · ❌ falta · ❓ depende de un panel externo (Vercel/Supabase) · 👤 lo tienes que hacer tú

---

## Pendiente (solo lo puedes hacer tú)

| # | Qué | Por qué |
|---|-----|---------|
| 1 | 👤 **Revisar los planes de Vercel y Supabase** (pospuesto a pedido). | Vercel Hobby no permite uso comercial. Supabase Free da ~5 GB de transferencia al mes y se pausa tras ~1 semana sin uso. Cuenta: una conferencia de 300 personas con un caso de 34 MB son ~10 GB. |
| 2 | 👤 **Ejecutar las migraciones SQL** en Supabase → SQL Editor, `migracion-2026-11-24-arreglos.sql` (límites e intentos atómicos, reservas de cupo atómicas, permisos y cierre de las funciones públicas viejas) **después** de que Vercel publique esta rama en producción. Ya incluye `migracion-2026-11-04-cerrar-funciones-viejas.sql`. | Si se ejecuta ANTES de desplegar, la versión anterior (que usa las funciones viejas) deja de funcionar para los estudiantes. Sin ejecutarla, esta versión funciona con el comportamiento anterior (límites y cupos no atómicos). |
| 3 | 👤 **Poner `CRON_SECRET`** en Vercel → Settings → Environment Variables (cadena larga y aleatoria) y volver a desplegar. | Sin ella, la limpieza diaria (`/api/cron/limpieza`) no hace nada: se acumulan archivos huérfanos, reservas vencidas y contadores. |
| 4 | 👤 **Crear un monitor de disponibilidad** (UptimeRobot o Better Stack, gratis) que consulte `https://<dominio>/api/salud` cada 1–5 min y te avise. | La ruta ya existe: responde 200 si la web y la base contestan, 503 si no. |
| 5 | 👤 **Hacer un respaldo cada semana:** `npm run respaldo`. Copiar la carpeta `respaldos/` a un disco externo o a tu Drive. | Ver `docs/respaldo-y-restauracion.md`. |
| 6 | 👤 **Dominio propio** (p. ej. `ecosim.co`) en Vercel, y `NEXT_PUBLIC_SITE_URL` apuntando a él. | Hoy es `ecosim-eta.vercel.app`. |
| 7 | 👤 **Imagen de vista previa de 1200×630 px** para cuando se comparte el enlace. | La actual es de 800×455. |
| 8 | 👤 (Opcional) **Activar el aviso por correo de solicitudes de contacto:** cuenta gratis en resend.com y, en Vercel, `RESEND_API_KEY` y `AVISO_SOLICITUDES_A` (tu correo). | Sin esas variables no se envía nada; las solicitudes se siguen viendo en el panel. |

---

## Medido en vivo (https://ecosim-eta.vercel.app, 2026-11-05, ANTES de los arreglos)

| Qué | Antes | Después (en la rama) |
|---|---|---|
| Landing `/` | ~0,5 s activa / ~1,4 s en frío, sin caché del CDN | ✅ Estática por idioma: la sirve el CDN (en local: 24 ms). |
| Página del estudiante `/c/cyf` | ~0,85 s / ~1,8 s | ✅ Desde la caché del CDN, renovada cada 60 s (en local: 15 ms; con 300 estudiantes a la vez, p95 de 22 ms). Los casos se siguen consultando en vivo. |
| Videos (Supabase Storage) | ✅ Caché de 1 año + CDN `HIT` | Sin cambios. |
| Imágenes de maniquíes | `max-age=0` | ✅ Una semana de caché. |
| `/c/noexiste` | 200 | ✅ 404. |
| Funciones públicas viejas | Abiertas | Se cierran con el segundo SQL del pendiente #2. |

---

## 1. Infraestructura y planes

| Estado | Punto | Notas |
|---|---|---|
| ❓👤 | Plan de Vercel apto para uso comercial | Pendiente #1. |
| ❓👤 | Plan de Supabase con transferencia suficiente | Pendiente #1. |
| ❓👤 | Alertas de gasto y uso en ambos paneles | Para que un pico no termine en factura sorpresa ni en corte. |
| ❌👤 | Dominio propio | Pendiente #6. |
| ✅ | HTTPS y HSTS | Los pone Vercel. |
| ⚠️👤 | Tarea diaria de limpieza protegida | `/api/cron/limpieza` con `CRON_SECRET` (pendiente #3). |

## 2. Seguridad

| Estado | Punto | Notas |
|---|---|---|
| ✅ | Clave `service_role` solo en el servidor | Ya rotada. |
| ✅ | Panel protegido | Middleware, y además cada acción del servidor comprueba sesión, rol y cuenta. |
| ✅ | Un cliente no puede tocar datos de otro | |
| ✅ | Base de datos cerrada por defecto (RLS) | |
| ⚠️👤 | Funciones viejas cerradas | Pendiente #2. |
| ✅ | **Límites de intentos aptos para IP compartida, guardados en la base** | Ver `src/lib/limites.js` (tabla `intentos`, compartida por todos los servidores):<br>• Login: 5 fallos por IP + correo y 50 por IP.<br>• Contacto: 3 por correo cada hora y 20 por IP.<br>• Cambio de contraseña: por usuario.<br>• Cupos de subida de videos (tabla `subidas_pendientes`). Se vuelven atómicos con el pendiente #2. |
| ➖ | Código de acceso de los estudiantes, 2FA | **No incluidos en esta versión.** Cualquiera con el enlace de la cuenta ve sus casos; el panel se protege con correo y contraseña. |
| ✅ | Registro público de usuarios desactivado | |
| ✅ | **CSP completa APLICADA** | Antes estaba solo en modo aviso. Probada sin violaciones en la landing, la guía, el estudiante (precarga y video) y el panel (subida con conversión ffmpeg de un video MPEG-4 Parte 2). |
| ✅ | **Dependencias sin vulnerabilidades** | `npm audit`: 0. `postcss` actualizado sin el salto a Next 16. `@supabase/ssr` 0.5 → 0.12.7. ffmpeg.wasm al día. |
| ⚠️ | Videos con URL pública | Bucket público: la URL de un video, una vez copiada, funciona para cualquiera. Es aceptable para material docente; si un cliente lo exige, se pueden usar URL firmadas que caducan. |

## 3. Rendimiento y escala

| Estado | Punto | Notas |
|---|---|---|
| ✅ | **Prueba de carga hecha** | `npm run prueba-carga`.<br>• 500 estudiantes abriendo el caso real de cyf en 20 s: 2.851 peticiones, **0 errores**, p95 de 265 ms.<br>• 300 estudiantes durante 75 s: 0 errores.<br>(No mide la descarga de videos: la sirve el CDN de Supabase y gasta cupo.) |
| ✅ | **Landing, guía y legales estáticas por idioma** | `/es`, `/pt`, `/en` se generan al compilar; el middleware sirve la del visitante sin cambiar la dirección. Incluye `hreflang` y un sitemap por idioma. |
| ✅ | Caché de imágenes fijas y de ffmpeg | |
| ✅ | Página del estudiante ligera, precarga con tope, sondeo pausado con la pestaña oculta | |
| ✅ | **Página del estudiante en la caché del CDN** | `c/[slug]/page.js` con ISR de 60 s y layout propio sin cookies (`src/app/(estudiante)/`). El idioma lo decide el navegador (`EntradaEstudiante.jsx`) y, hasta saberlo, solo se ve el logo, así que no hay parpadeos. Los cambios en la cuenta (desactivarla, renombrarla, cambiar su idioma) tardan hasta 1 minuto en verse para quien entra de nuevo. Los cambios en los casos se ven al momento. Una cuenta inexistente también queda 1 minuto en caché como 404 (es muy poco espacio). |
| ⚠️ | Wi-Fi saturado del salón | 40 × 35 MB = 1,4 GB por el mismo punto de acceso. En eventos grandes, usar un caso de demostración ligero. |

## 4. Fiabilidad durante la clase

| Estado | Punto | Notas |
|---|---|---|
| ✅ | Un corte de red no saca al estudiante de su caso | |
| ✅ | **Pantallas de error propias con «Reintentar»** | Hay una para el estudiante, una para el panel, una para las páginas públicas y una global, en los tres idiomas. |
| ✅ | **«No se pudo conectar» ≠ «no disponible»** | Si Supabase falla, el estudiante ve «revisa tu conexión» con un botón para reintentar. Una cuenta inexistente o desactivada da 404. |
| ✅ | **Indicador «Guardando…» en el panel** | Las acciones lentas, como borrar un caso con videos, ya no parecen colgadas. |
| ✅ | 404 propias | Incluyen las direcciones que prueban los bots, sin ensuciar el registro del servidor. |

## 5. Monitoreo y operación

| Estado | Punto | Notas |
|---|---|---|
| ✅ | Errores del servidor en el registro de Vercel | Vercel → proyecto → Logs. |
| ➖ | Registro de errores en la base (pestaña «Errores») y aviso por correo | **No incluidos en esta versión.** |
| ✅ | Aviso por correo de solicitudes de contacto | Con Resend; opcional (pendiente #8). |
| ✅ | **Ruta de salud** `/api/salud` | Falta conectarle el monitor (pendiente #4). |
| ✅ | **Prueba de humo tras cada despliegue** | `npm run humo -- https://<dominio> cyf`: 15 comprobaciones en segundos. |
| ✅ | Analítica y métricas de velocidad | Vercel. |

## 6. Datos y copias de seguridad

| Estado | Punto | Notas |
|---|---|---|
| ✅ | **Respaldo de base Y de videos/exámenes** | `npm run respaldo`. Probado: 8 tablas + 37 archivos (74 MB). Las siguientes veces solo baja lo nuevo. |
| ✅ | **Restauración** | `npm run restaurar`: en simulación por defecto, nunca borra ni pisa nada. Probada en simulación. Guía en `docs/respaldo-y-restauracion.md`. |
| ❓ | Backups automáticos de la base en Supabase | Solo en el plan Pro (pendiente #1). |

## 7. Calidad y despliegue

| Estado | Punto | Notas |
|---|---|---|
| ✅ | Compila sin errores | |
| ✅ | **Pruebas automáticas** (`npm test`) | Antes eran 7. Cubren también límites, idiomas (mismas claves es/pt/en) y el correo de aviso de solicitudes. |
| ✅ | **CI en cada PR y en cada push a `main`** | Corre pruebas, `npm audit` y build. |
| ✅ | Panel probado con sesión iniciada | Puntos, casos, exámenes, **subida de video con conversión** y cupo, con la cuenta `prueba2` (ya borrada desde entonces). |
| ✅ | Vista previa por rama y vuelta atrás en un clic | Vercel. |

## 8. Accesibilidad, móvil e idiomas

| Estado | Punto | Notas |
|---|---|---|
| ✅ | **Revisión de accesibilidad** | Se revisaron la landing, el estudiante y el panel.<br>• Todos los campos del panel tienen nombre para lectores de pantalla.<br>• Cada vista tiene un `h1`.<br>• El texto tenue del simulador y el botón de WhatsApp ahora cumplen el contraste AA (4,5:1). |
| ✅ | Funciona en teléfono; respeta «reducir movimiento»; tres idiomas | |

## 9. Legal y comercial

| Estado | Punto | Notas |
|---|---|---|
| ✅ | Términos y privacidad; Ley 1581; sin datos de estudiantes; analítica sin cookies | |
| ❓👤 | Plan de hosting permite vender | Pendiente #1. |

## 10. SEO y presentación

| Estado | Punto | Notas |
|---|---|---|
| ✅ | `robots.txt` (ahora también excluye `/api/`), sitemap con los 3 idiomas, `hreflang`, Open Graph | |
| ⚠️👤 | Imagen de vista previa 1200×630 | Pendiente #7. |

---

## Checklist de evento (antes de cada clase grande o conferencia)

- [ ] `npm run humo -- https://<dominio> <slug>` → «Todo bien».
- [ ] El monitor de `/api/salud` en verde y Supabase sin pausar, con cupo de transferencia este mes.
- [ ] Abrir el enlace del caso **en el Wi-Fi del lugar** el día antes.
- [ ] Caso de demostración ligero (pocos videos) si hay más de ~100 personas.
- [ ] QR del enlace en la diapositiva.
- [ ] App de escritorio en el portátil del ponente como plan B sin internet.
- [ ] No publicar cambios a `main` el mismo día del evento.
