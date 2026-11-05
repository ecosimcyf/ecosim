// ============================================================
// Código de acceso de los estudiantes — partes SOLO de servidor:
// normalizar, cifrar (scrypt) y comprobar el código, y crear el token.
// Sin dependencias de Next.js, para poder probarlo con `npm test`.
// ============================================================
import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';

// 6 como mínimo: con letras y números son más de 2.000 millones de
// combinaciones, imposibles de adivinar al ritmo que permite el límite de
// intentos (ver actions/estudiante.js). Los códigos de 4 o 5 que ya existían
// siguen funcionando; solo los NUEVOS deben tener 6.
export const CODIGO_MIN = 6;
export const CODIGO_MAX = 40;

// Sin distinguir mayúsculas ni espacios de los extremos: el profesor lo
// dicta en voz alta y los estudiantes lo escriben en el teléfono.
export function normalizarCodigo(c) {
  return String(c ?? '').trim().toLowerCase();
}

export function codigoValido(c) {
  const n = normalizarCodigo(c);
  return n.length >= CODIGO_MIN && n.length <= CODIGO_MAX;
}

// "scrypt$<sal>$<hash>" en base64url.
export function cifrarCodigo(codigo) {
  const sal = randomBytes(16);
  const hash = scryptSync(normalizarCodigo(codigo), sal, 32);
  return 'scrypt$' + sal.toString('base64url') + '$' + hash.toString('base64url');
}

export function comprobarCodigo(codigo, guardado) {
  const partes = String(guardado || '').split('$');
  if (partes.length !== 3 || partes[0] !== 'scrypt') return false;
  try {
    const esperado = Buffer.from(partes[2], 'base64url');
    const hash = scryptSync(normalizarCodigo(codigo), Buffer.from(partes[1], 'base64url'), esperado.length);
    return esperado.length === 32 && timingSafeEqual(hash, esperado);
  } catch {
    return false;
  }
}

// Secreto que recibe el navegador del estudiante (imposible de adivinar).
export function nuevoTokenAcceso() {
  return randomBytes(24).toString('base64url');
}
