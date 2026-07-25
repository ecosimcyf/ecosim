// ============================================================
// Límite de intentos de login — muy simple, en memoria.
//
// Frena la fuerza bruta contra el panel: tras 5 fallos en 10 minutos,
// bloquea ese origen (IP) durante el resto de la ventana.
//
// Nota: en Vercel (servidor "sin estado") cada instancia tiene su propia
// memoria, así que no es un candado perfecto, pero para una app de un
// solo administrador basta para frenar un ataque básico.
// ============================================================

const MAX_INTENTOS = 5;
const VENTANA_MS = 10 * 60 * 1000; // 10 minutos

const intentos = new Map(); // ip -> { count, primero }

export function estaBloqueado(ip) {
  const reg = intentos.get(ip);
  if (!reg) return false;
  if (Date.now() - reg.primero > VENTANA_MS) { intentos.delete(ip); return false; }
  return reg.count >= MAX_INTENTOS;
}

export function registrarIntento(ip) {
  const reg = intentos.get(ip);
  if (!reg || Date.now() - reg.primero > VENTANA_MS) {
    intentos.set(ip, { count: 1, primero: Date.now() });
  } else {
    reg.count++;
  }
}

export function limpiarIntentos(ip) {
  intentos.delete(ip);
}
