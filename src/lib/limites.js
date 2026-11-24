// ============================================================
// Cuántos intentos se permiten en cada formulario (ver src/lib/ratelimit.js).
// Sin dependencias de Next.js, para poder probarlo con `npm test`.
//
// OJO con la IP compartida: en un salón, una conferencia o una red de
// universidad, CIENTOS de personas salen a internet con la MISMA IP. Un
// límite solo por IP bloquearía a todo el auditorio por los errores de
// tipeo de unos pocos. Por eso cada límite va por IP + algo de la persona
// (su correo, su usuario, la cuenta que intenta abrir), con un tope por IP
// solo mucho más alto, contra abusos.
// ============================================================
const MIN = 60;

export const LIMITES = {
  // Login del panel: 5 fallos por IP y correo (un profesor que se equivoca
  // no bloquea a los demás del mismo taller) y 50 por IP en total.
  loginCorreo: { max: 5, ventanaSeg: 10 * MIN },
  loginIp: { max: 50, ventanaSeg: 10 * MIN },
  // Cambio de contraseña: 5 fallos de la contraseña actual por usuario.
  clave: { max: 5, ventanaSeg: 10 * MIN },
  // Formulario de contacto (se cuentan TODOS los envíos): 3 por correo
  // cada hora y 20 por IP cada 10 minutos — tras una charla, muchos
  // asistentes lo llenan a la vez desde el mismo Wi-Fi.
  contactoCorreo: { max: 3, ventanaSeg: 60 * MIN },
  contactoIp: { max: 20, ventanaSeg: 10 * MIN },
};

// Clave del contador: partes unidas con ':' (correo en minúsculas, sin
// espacios), recortada al tamaño de la columna.
export function claveLimite(...partes) {
  return partes.map((p) => String(p ?? '').trim().toLowerCase()).join(':').slice(0, 200);
}

// Tope global de avisos por correo de solicitudes de contacto, por día: si
// alguien llena el formulario con miles de correos distintos, la solicitud
// se guarda igual pero ya no se manda el aviso (no gastar envíos de Resend).
export const LIMITE_CORREO_DIA = { max: 50, ventanaSeg: 24 * 60 * MIN };

// Clave de IP para los contadores. Una IPv4 se usa entera. De una IPv6 solo
// cuenta el prefijo /64: cada conexión doméstica recibe un /64 completo (2^64
// direcciones), así que con la IP entera un atacante cambiaría de dirección
// en cada intento y nunca llegaría al límite.
export function claveIp(ip) {
  const v = String(ip ?? '').trim().toLowerCase().split('%')[0];
  if (!v) return 'desconocido';
  if (!v.includes(':')) return v;
  const mapeada = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(v); // IPv4 dentro de IPv6
  if (mapeada) return mapeada[1];
  let grupos;
  if (v.includes('::')) {
    const [izq, der] = v.split('::');
    const a = izq ? izq.split(':') : [];
    const b = der ? der.split(':') : [];
    if (a.length + b.length > 7) return v;
    grupos = [...a, ...Array(8 - a.length - b.length).fill('0'), ...b];
  } else {
    grupos = v.split(':');
  }
  if (grupos.length !== 8) return v;
  const hex = grupos.slice(0, 4).map((g) => (/^[0-9a-f]{1,4}$/.test(g) ? parseInt(g, 16).toString(16) : null));
  if (hex.includes(null)) return v;
  return hex.join(':') + '::/64';
}

// Quita saltos de línea (\r, \n) de un texto que va a una cabecera de
// correo (el asunto): con ellos, quien llena el formulario podría inyectar
// cabeceras extra (Bcc: …) o romper el mensaje.
export function sinSaltos(valor) {
  return String(valor ?? '').replace(/[\r\n\u2028\u2029]+/g, ' ').trim();
}
