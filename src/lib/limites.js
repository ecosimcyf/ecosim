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
  // Código de acceso del estudiante: 150 fallos cada 10 minutos por IP y
  // cuenta. Alcanza para un auditorio de cientos de personas con errores de
  // tipeo; aun así, adivinar un código de 6 letras y números a ese ritmo
  // tomaría más de 100 años.
  codigo: { max: 150, ventanaSeg: 10 * MIN },
  // Errores que reportan los navegadores (src/app/actions/errores.js).
  erroresNavegador: { max: 30, ventanaSeg: 10 * MIN },
};

// Clave del contador: partes unidas con ':' (correo en minúsculas, sin
// espacios), recortada al tamaño de la columna.
export function claveLimite(...partes) {
  return partes.map((p) => String(p ?? '').trim().toLowerCase()).join(':').slice(0, 200);
}
