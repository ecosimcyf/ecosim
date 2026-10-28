// ============================================================
// Maniquíes — fotos reales del perro y del gato, por vista.
//
// Antes eran dibujos SVG portados de la app de escritorio
// (src/maniquies.js); se reemplazaron por fotos y el SVG viejo se quitó
// (viajaba entero al navegador sin usarse).
//
// Cada vista define su propia relación de aspecto (ancho/alto):
// .mq-canvas la lee de --mq-ratio (ver ratio() más abajo) para que los
// puntos, guardados en % de ancho/alto, caigan siempre en el mismo sitio
// de la foto.
//
// Las fotos van en WebP (≈ 50-80 KB cada una en vez de 200-400 KB en PNG):
// importa en los móviles de los estudiantes, con datos limitados.
// ============================================================

const FOTOS = {
  perro: {
    ventral: { src: '/maniquies/perro-ventral.webp', ratio: 0.6, etiqueta: 'Maniquí de perro en vista ventral' },
    izq: { src: '/maniquies/perro-izq.webp', ratio: 2.4, etiqueta: 'Perro — lado izquierdo' },
    der: { src: '/maniquies/perro-der.webp', ratio: 2.4, etiqueta: 'Perro — lado derecho' },
  },
  gato: {
    ventral: { src: '/maniquies/gato-ventral.webp', ratio: 0.6, etiqueta: 'Maniquí de gato en vista ventral' },
    izq: { src: '/maniquies/gato-izq.webp', ratio: 2.4, etiqueta: 'Gato — lado izquierdo' },
    der: { src: '/maniquies/gato-der.webp', ratio: 2.4, etiqueta: 'Gato — lado derecho' },
  },
};

function foto(especie, vista) {
  const porVista = FOTOS[especie === 'gato' ? 'gato' : 'perro'];
  return porVista[vista] || porVista.ventral;
}

export const MANIQUIES = {
  // vista: 'ventral' (por debajo) | 'izq' (lado izquierdo) | 'der' (lado derecho)
  // Devuelve el HTML del arte (se inyecta con dangerouslySetInnerHTML).
  svg(especie, vista) {
    const f = foto(especie, vista);
    return `<img src="${f.src}" alt="${f.etiqueta}" class="mq-svg mq-foto" draggable="false" />`;
  },
  // Ruta de la foto, para precargarla antes de que el estudiante cambie de vista.
  src(especie, vista) { return foto(especie, vista).src; },
  // Relación ancho/alto del arte actual (ver cabecera).
  ratio(especie, vista) { return foto(especie, vista).ratio; },
  esLado(vista) { return vista === 'izq' || vista === 'der'; },
  nombreVista(vista) {
    return vista === 'izq' ? 'Lado izquierdo' : vista === 'der' ? 'Lado derecho' : 'Por debajo';
  },
  nombre(especie) { return especie === 'gato' ? 'Gato' : 'Perro'; },
};
