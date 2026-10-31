// ============================================================
// Prepara un archivo de examen antes de subirlo (en el navegador).
//
// Las imágenes se re-codifican a WebP (o JPEG si el navegador no sabe
// escribir WebP) con el lado mayor en 2400 px como máximo: una radiografía
// sacada del equipo o del celular suele pesar varios MB y queda en unos
// cientos de KB sin perder lo que se ve en pantalla. Así el estudiante la
// descarga rápido y ocupa poco del cupo de la cuenta.
//
// Los PDF se suben tal cual. Los errores son claves de texto (err.*, ver
// i18n/textos/panel.js) que el panel traduce.
// ============================================================
const LADO_MAX = 2400;

export async function prepararArchivoExamen(file) {
  if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
    return new File([file], file.name, { type: 'application/pdf' });
  }
  if (!/^image\//.test(file.type)) {
    throw new Error('err.noImagen');
  }

  let bmp;
  try {
    bmp = await createImageBitmap(file);
  } catch {
    // HEIC del iPhone, TIFF, DICOM…: el navegador no los sabe leer.
    throw new Error('err.leerImagen');
  }
  const escala = Math.min(1, LADO_MAX / Math.max(bmp.width, bmp.height));
  const w = Math.max(1, Math.round(bmp.width * escala));
  const h = Math.max(1, Math.round(bmp.height * escala));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d').drawImage(bmp, 0, 0, w, h);
  bmp.close?.();

  const aBlob = (tipo, calidad) => new Promise((res) => canvas.toBlob(res, tipo, calidad));
  let blob = await aBlob('image/webp', 0.86);
  // Safari viejo no escribe WebP: devuelve PNG en su lugar.
  if (!blob || blob.type !== 'image/webp') blob = await aBlob('image/jpeg', 0.9);
  if (!blob) throw new Error('err.procesarImagen');

  // Si la original ya era más liviana (y de un tipo aceptado), se usa esa.
  const aceptada = ['image/webp', 'image/jpeg', 'image/png'].includes(file.type);
  if (aceptada && escala === 1 && file.size <= blob.size) return file;

  const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
  return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.' + ext, { type: blob.type });
}

// "RX torax LL.jpeg" -> "RX torax LL" (título inicial del archivo).
export function tituloDesdeNombre(nombre) {
  return String(nombre || '').replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').trim().slice(0, 120);
}
