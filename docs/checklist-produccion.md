# Checklist de producción — EcoSim web

- **Auditoría:** 2026-11-05.
- **Arreglos:** el mismo día, en la rama `mejoras-revision-nov2026`, la de noviembre, **todavía sin mezclar a `main`**. Todo lo marcado ✅ aquí está en esa rama y llega a producción cuando se mezcle.
- **Objetivo:** que la web aguante clases, conferencias y picos de tráfico sin fallar delante de la gente.

**Leyenda:** ✅ cumple · ⚠️ a medias · ❌ falta · ❓ depende de un panel externo (Vercel/Supabase) · 👤 lo tienes que hacer tú

---

## Pendiente (solo lo puedes hacer tú)

| # | Qué | Por qué |
|---|-----|---------|
| 1 | 👤 **Revisar los planes de Vercel y Supabase** (pospuesto a pedido). | Vercel Hobby no permite uso comercial. Supabase Free da ~5 GB de transferencia al mes y se pausa tras ~1 semana sin uso. Cuenta: una conferencia de 300 personas con un caso de 34 MB son ~10 GB. |
| 2 | 👤 **Mezclar la rama de noviembre a `main`** y después ejecutar `migracion-2026-11-04-cerrar-funciones-viejas.sql`. | Sin ese SQL, el código de acceso se puede saltar. |
| 3 | 👤 **Crear un monitor de disponibilidad** (UptimeRobot o Better Stack, gratis) que consulte `https://<dominio>/api/salud` cada 1–5 min y te avise. | La ruta ya existe: responde 200 si la web y la base contestan, 503 si no. |
| 4 | 👤 **Activar la verificación en dos pasos** en tu cuenta de super_admin: panel → «Contraseña y seguridad». | El panel te lo recuerda con un aviso amarillo mientras no la actives. |
| 5 | 👤 **Hacer un respaldo cada semana:** `npm run respaldo`. Copiar la carpeta `respaldos/` a un disco externo o a tu Drive. | Ver `docs/respaldo-y-restauracion.md`. |
| 6 | 👤 **Dominio propio** (p. ej. `ecosim.co`) en Vercel, y `NEXT_PUBLIC_SITE_URL` apuntando a él. | Hoy es `ecosim-eta.vercel.app`. |
| 7 | 👤 **Probar una vez el login con 2FA** en la vista previa de Vercel: activarla, cerrar sesión, entrar y escribir el código. | Activarla, confirmarla y quitarla sí se probó; el paso del código al iniciar sesión necesita tu contraseña. |
| 8 | 👤 **Imagen de vista previa de 1200×630 px** para cuando se comparte el enlace. | La actual es de 800×455. |
| 9 | 👤 **Activar el aviso de errores por correo:** crear una cuenta gratis en resend.com y poner en Vercel `RESEND_API_KEY` y `AVISO_ERRORES_A` (tu correo). | Sin esas dos variables no se envía nada. Ver `src/lib/aviso-errores.js`. |

---

## Medido en vivo (https://ecosim-eta.vercel.app, 2026-11-05, ANTES de los arreglos)

| Qué | Antes | Después (en la rama) |
|---|---|---|
| Landing `/` | ~0,5 s activa / ~1,4 s en frío, sin caché del CDN | ✅ Estática por idioma: la sirve el CDN (en local: 24 ms). |
| Página del estudiante `/c/cyf` | ~0,85 s / ~1,8 s | ✅ Desde la caché del CDN, renovada cada 60 s (en local: 15 ms; con 300 estudiantes a la vez, p95 de 22 ms). Los casos se siguen consultando en vivo. |
| Videos (Supabase Storage) | ✅ Caché de 1 año + CDN `HIT` | Sin cambios. |
| Imágenes de maniquíes | `max-age=0` | ✅ Una semana de caché. |
| `/c/noexiste` | 200 | ✅ 404. |
| Funciones públicas viejas | Abiertas | Se cierran con el SQL del pendiente #2. |

---

## 1. Infraestructura y planes

| Estado | Punto | Notas |
|---|---|---|
| ❓👤 | Plan de Vercel apto para uso comercial | Pendiente #1. |
| ❓👤 | Plan de Supabase con transferencia suficiente | Pendiente #1. |
| ❓👤 | Alertas de gasto y uso en ambos paneles | Para que un pico no termine en factura sorpresa ni en corte. |
| ❌👤 | Dominio propio | Pendiente #6. |
| ✅ | HTTPS y HSTS | Los pone Vercel. |
| ✅ | Tarea diaria de limpieza protegida | `/api/cron/limpieza` con `CRON_SECRET`. |

## 2. Seguridad

| Estado | Punto | Notas |
|---|---|---|
| ✅ | Clave `service_role` solo en el servidor | Ya rotada. |
| ✅ | Panel protegido | Middleware, y además cada acción del servidor comprueba sesión, rol y cuenta. |
| ✅ | Un cliente no puede tocar datos de otro | |
| ✅ | Base de datos cerrada por defecto (RLS) | |
| ⚠️👤 | Funciones viejas cerradas | Pendiente #2. |
| ✅ | **Límites de intentos aptos para IP compartida** | Ver `src/lib/limites.js`:<br>• Login: 5 fallos por IP + correo y 50 por IP.<br>• Contacto: 3 por correo cada hora y 20 por IP.<br>• Código del estudiante: 150 fallos por IP + cuenta.<br>• Cambio de contraseña: por usuario. |
| ✅ | **Códigos de acceso nuevos de 6+ caracteres** | Los de 4–5 que ya existían siguen valiendo. Adivinar uno nuevo al ritmo permitido tomaría más de 100 años. |
| ✅ | **Verificación en dos pasos (2FA)** | TOTP de Supabase:<br>• Opcional por admin, desde «Contraseña y seguridad».<br>• Con ella activa, el middleware y cada acción exigen el código.<br>• «Restablecer contraseña» del super_admin también la quita, por si el cliente pierde el teléfono.<br>• Aviso al super_admin mientras no la active. |
| ✅ | Registro público de usuarios desactivado | |
| ✅ | **CSP completa APLICADA** | Antes estaba solo en modo aviso. Probada sin violaciones en la landing, la guía, el estudiante (precarga y video) y el panel (subida con conversión ffmpeg de un video MPEG-4 Parte 2). |
| ✅ | **Dependencias sin vulnerabilidades** | `npm audit`: 0. `postcss` actualizado sin el salto a Next 16. `@supabase/ssr` 0.5 → 0.12.7. ffmpeg.wasm al día. |
| ⚠️ | Videos protegidos por el código | Bucket público: la URL de un video, una vez copiada, funciona sin código. Es aceptable para material docente; si un cliente lo exige, se pueden usar URL firmadas que caducan. |

## 3. Rendimiento y escala

| Estado | Punto | Notas |
|---|---|---|
| ✅ | **Prueba de carga hecha** | `npm run prueba-carga`.<br>• 500 estudiantes abriendo el caso real de cyf en 20 s: 2.851 peticiones, **0 errores**, p95 de 265 ms.<br>• 300 estudiantes durante 75 s: 0 errores.<br>(No mide la descarga de videos: la sirve el CDN de Supabase y gasta cupo.) |
| ✅ | **Landing, guía y legales estáticas por idioma** | `/es`, `/pt`, `/en` se generan al compilar; el middleware sirve la del visitante sin cambiar la dirección. Incluye `hreflang` y un sitemap por idioma. |
| ✅ | Caché de imágenes fijas y de ffmpeg | |
| ✅ | Página del estudiante ligera, precarga con tope, sondeo pausado con la pestaña oculta | |
| ✅ | **Página del estudiante en la caché del CDN** | `c/[slug]/page.js` con ISR de 60 s y layout propio sin cookies (`src/app/(estudiante)/`). El idioma y el código los decide el navegador (`EntradaEstudiante.jsx`) y, hasta saberlos, solo se ve el logo, así que no hay parpadeos. Los cambios en la cuenta (desactivarla, renombrarla, cambiar su idioma) tardan hasta 1 minuto en verse para quien entra de nuevo. Los cambios en los casos y en el código se ven al momento. Una cuenta inexistente también queda 1 minuto en caché como 404 (es muy poco espacio). |
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
| ✅ | Errores del servidor guardados | Pestaña «Errores» del super_admin. |
| ✅ | **Errores del navegador guardados** | Llegan a la misma pestaña con origen `navegador:*`, la ruta y el navegador.<br>• Se filtra el ruido (extensiones, «Script error.»).<br>• Límite de 30 por IP cada 10 minutos y 5 por página. |
| ✅ | **Aviso de errores por correo** | Un resumen como mucho cada 30 minutos, compartido entre servidores. Los errores del navegador solo avisan si son 3 o más en 10 minutos. Si la base no responde, avisa igual. Probado en modo «solo registro». Falta activarlo (pendiente #9). |
| ✅ | **Ruta de salud** `/api/salud` | Falta conectarle el monitor (pendiente #3). |
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
| ✅ | **16 pruebas automáticas** | Antes eran 7. Ahora cubren también límites, filtro de errores, idiomas, 2FA y el correo de aviso. Una de las nuevas encontró un fallo real en el filtro de errores, ya corregido. |
| ✅ | **CI en cada PR y en cada push a `main`** | Corre pruebas, `npm audit` y build. |
| ✅ | Panel probado con sesión iniciada | Puntos, casos, código, exámenes, **subida de video con conversión**, 2FA y cupo, con la cuenta `prueba2` (ya borrada desde entonces). |
| ⚠️👤 | Login con 2FA de punta a punta | Pendiente #7. |
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
| ⚠️👤 | Imagen de vista previa 1200×630 | Pendiente #8. |

---

## Checklist de evento (antes de cada clase grande o conferencia)

- [ ] `npm run humo -- https://<dominio> <slug>` → «Todo bien».
- [ ] El monitor de `/api/salud` en verde y Supabase sin pausar, con cupo de transferencia este mes.
- [ ] Abrir el enlace del caso **en el Wi-Fi del lugar** el día antes.
- [ ] Caso de demostración ligero (pocos videos) si hay más de ~100 personas.
- [ ] Código de acceso escrito grande en la pantalla (o quitarlo ese día).
- [ ] QR del enlace en la diapositiva.
- [ ] App de escritorio en el portátil del ponente como plan B sin internet.
- [ ] No publicar cambios a `main` el mismo día del evento.
