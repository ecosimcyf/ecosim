// ============================================================
// Código de acceso de los estudiantes — partes que usan el servidor Y el
// navegador (sin nada de node:crypto; eso está en codigo-acceso.js).
//
// Tras escribir bien el código, el navegador guarda en una cookie el
// "token de acceso" de esa cuenta (un secreto aleatorio, NO el código) y
// lo manda en cada consulta. La base de datos lo exige (ver
// supabase/migracion-2026-11-04-revision.sql). La cookie no es httpOnly a
// propósito: el navegador la necesita para consultar Supabase directo.
// ============================================================

export const DIAS_ACCESO = 30;

// Una cookie por cuenta: un mismo navegador puede entrar a varias.
export function nombreCookieAcceso(cuentaId) {
  return 'acceso_' + String(cuentaId).replace(/[^a-zA-Z0-9_-]/g, '');
}

// Lee el token de la cookie (solo en el navegador).
export function tokenAccesoNavegador(cuentaId) {
  if (typeof document === 'undefined') return null;
  const nombre = nombreCookieAcceso(cuentaId) + '=';
  const par = document.cookie.split('; ').find((c) => c.startsWith(nombre));
  return par ? decodeURIComponent(par.slice(nombre.length)) : null;
}

// Error que lanza la base cuando falta el código o ya no vale (cambió).
export function esErrorDeCodigo(error) {
  return error?.code === '28000';
}
