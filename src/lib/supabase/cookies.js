// Opciones de las cookies de sesión del panel (las usan server.js y
// middleware.js). httpOnly: ningún script de la página puede leerlas (si
// alguien lograra inyectar JavaScript, no se llevaría la sesión). Es seguro
// porque el navegador NO necesita la sesión de Supabase: el panel sube los
// archivos con URLs firmadas (token propio) y el estudiante es anónimo; todo
// lo demás pasa por Server Actions, que leen la cookie en el servidor.
// maxAge: la sesión deja de valer a las 12 h aunque no cierren sesión.
export const OPCIONES_COOKIE_SESION = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 12 * 60 * 60,
  path: '/',
};
