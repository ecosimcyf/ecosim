// ============================================================
// Lógica PURA del recorte de vídeo (sin DOM ni ffmpeg): cálculo del tramo,
// formato mm:ss y argumentos de ffmpeg. Vive aparte para poder probarla con
// node:test (tests/recorte.test.mjs).
// ============================================================

// Un tramo siempre dura al menos esto (segundos).
export const RECORTE_MIN_SEG = 1;

const num = (v, defecto = 0) => (Number.isFinite(v) ? v : defecto);
// Redondea a décimas: evita valores como 12.300000000000001 en pantalla y en
// los argumentos de ffmpeg.
const dec = (v) => Math.round(v * 10) / 10;

// 75.4 -> "1:15" (mm:ss; con décima si conDecimas). Nunca negativo.
export function formatearTiempo(seg, conDecimas = false) {
  const s = Math.max(0, num(seg));
  const total = conDecimas ? Math.round(s * 10) / 10 : Math.floor(s);
  const m = Math.floor(total / 60);
  const r = total - m * 60;
  const rs = conDecimas ? r.toFixed(1).padStart(4, '0') : String(Math.floor(r)).padStart(2, '0');
  return m + ':' + rs;
}

// Acota un tramo a la duración real del vídeo y al máximo permitido.
//  - largo: entre RECORTE_MIN_SEG y min(max, duracion)
//  - inicio: entre 0 y duracion - largo
// Devuelve { inicio, largo, fin } en décimas de segundo.
export function acotarRecorte({ inicio, largo, duracion, max }) {
  const dur = Math.max(0, num(duracion));
  const tope = Math.max(0, Math.min(num(max, dur), dur));
  const minimo = Math.min(RECORTE_MIN_SEG, tope);
  const l = dec(Math.min(tope, Math.max(minimo, num(largo, tope))));
  const i = dec(Math.min(Math.max(0, dur - l), Math.max(0, num(inicio))));
  return { inicio: i, largo: l, fin: dec(i + l) };
}

// ¿Hace falta recortar? (el vídeo supera el máximo, con 0,5 s de margen)
export function necesitaRecorte(duracion, max) {
  return Number.isFinite(duracion) && duracion > max + 0.5;
}

// Argumentos de entrada de ffmpeg para el tramo. -ss ANTES de -i: salto
// rápido al keyframe previo y, al recodificar, descarta los fotogramas hasta
// el instante exacto (recorte preciso). -t limita la duración de salida.
export function argsRecorte(recorte) {
  if (!recorte) return { antes: [], salida: [] };
  const { inicio, largo } = recorte;
  return {
    antes: ['-ss', String(dec(Math.max(0, num(inicio))))],
    salida: ['-t', String(dec(Math.max(RECORTE_MIN_SEG, num(largo, RECORTE_MIN_SEG))))],
  };
}

// Línea de comandos completa de ffmpeg (misma codificación «Ligera» con y sin
// recorte). entrada/salida son nombres del sistema de archivos virtual.
export function construirArgsFFmpeg(recorte, entrada = 'entrada', salida = 'salida.mp4') {
  const { antes, salida: tiempo } = argsRecorte(recorte);
  return [
    ...antes,
    '-i', entrada,
    ...tiempo,
    '-vf', 'scale=960:-2',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '27', '-pix_fmt', 'yuv420p',
    '-an',
    '-movflags', '+faststart',
    salida,
  ];
}
