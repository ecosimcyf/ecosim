// Datos de contacto y "interruptores" de la landing, en un solo sitio.

// WhatsApp del asesor (formato internacional, solo dígitos, para wa.me).
export const WHATSAPP_NUMERO = '573011392041';
export const WHATSAPP_VISIBLE = '+57 301 139 2041';
// Con el saludo ya escrito en el idioma del visitante (ver textos/landing.js).
export function whatsappUrl(mensaje) {
  return 'https://wa.me/' + WHATSAPP_NUMERO + '?text=' + encodeURIComponent(mensaje);
}

export const CORREO = 'pablosuaza4@gmail.com';

// Botón «Probar la demo» (lleva a /c/demo). APAGADO hasta que la cuenta
// demo tenga casos presentables (nombres y descripciones reales, sin
// casos de prueba): un visitante que entra y ve «prueba2» se lleva una
// mala impresión. Para encenderlo, cambia a true.
export const DEMO_PUBLICA = false;

// Video corto en bucle de la app en uso (p. ej. '/landing/demo.mp4'). Si
// es null, la vitrina muestra la captura estática.
export const DEMO_VIDEO = null;
