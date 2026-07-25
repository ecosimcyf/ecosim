// ============================================================
// Sesión del administrador — una cookie firmada, sin base de datos.
//
// La cookie guarda solo una fecha de caducidad, firmada con HMAC-SHA256
// usando ADMIN_SESSION_SECRET. Si alguien la manipula, la firma no cuadra
// y se rechaza. Usa la Web Crypto API estándar para que funcione TANTO en
// el middleware (Edge) COMO en las Server Actions (Node).
// ============================================================

export const COOKIE_SESION = 'admin_session';
const DURACION_MS = 8 * 60 * 60 * 1000; // 8 horas

const enc = new TextEncoder();
const dec = new TextDecoder();

function b64url(bytes) {
  let bin = '';
  const arr = new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function desdeB64url(str) {
  const bin = atob(str.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function claveHMAC(secret) {
  return crypto.subtle.importKey(
    'raw', enc.encode(secret || ''),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']
  );
}

// Crea el valor de la cookie: "<datos>.<firma>"
export async function crearToken(secret) {
  const datos = b64url(enc.encode(JSON.stringify({ exp: Date.now() + DURACION_MS })));
  const key = await claveHMAC(secret);
  const firma = await crypto.subtle.sign('HMAC', key, enc.encode(datos));
  return datos + '.' + b64url(firma);
}

// Devuelve true solo si la firma es válida y no ha caducado.
export async function verificarToken(token, secret) {
  if (!token || !token.includes('.')) return false;
  const [datos, firma] = token.split('.');
  try {
    const key = await claveHMAC(secret);
    const ok = await crypto.subtle.verify('HMAC', key, desdeB64url(firma), enc.encode(datos));
    if (!ok) return false;
    const payload = JSON.parse(dec.decode(desdeB64url(datos)));
    return typeof payload.exp === 'number' && payload.exp > Date.now();
  } catch {
    return false;
  }
}
