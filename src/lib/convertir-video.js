// ============================================================
// Conversión de video a H.264 dentro del navegador, con ffmpeg.wasm.
//
// Se usa SOLO en el panel de admin, y solo cuando el video subido no es
// reproducible por el navegador (p. ej. MPEG-4 Parte 2, que exportan
// muchos ecógrafos). Es el equivalente a lo que hacía la app de
// escritorio con ffmpeg, pero corriendo en el propio navegador.
//
// El núcleo (ffmpeg-core.js / .wasm) se sirve desde /ffmpeg (carpeta
// public), no desde un CDN externo.
// ============================================================

let ffmpegPromesa = null;

// Carga ffmpeg una sola vez (se reutiliza en conversiones sucesivas).
async function cargarFFmpeg() {
  if (ffmpegPromesa) return ffmpegPromesa;
  ffmpegPromesa = (async () => {
    const { FFmpeg } = await import('@ffmpeg/ffmpeg');
    const { toBlobURL } = await import('@ffmpeg/util');
    const ffmpeg = new FFmpeg();
    const base = '/ffmpeg';
    await ffmpeg.load({
      coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    return ffmpeg;
  })();
  return ffmpegPromesa;
}

// ¿El navegador puede reproducir este archivo tal cual? Así no reconvertimos
// videos que ya son H.264 (evita perder calidad y tiempo).
export function puedeReproducir(file) {
  return new Promise((resolve) => {
    const v = document.createElement('video');
    const url = URL.createObjectURL(file);
    let hecho = false;
    const fin = (r) => { if (hecho) return; hecho = true; clearTimeout(t); URL.revokeObjectURL(url); resolve(r); };
    const t = setTimeout(() => fin(false), 8000);
    v.muted = true;
    v.preload = 'auto';
    v.onloadeddata = () => fin(true);
    v.onerror = () => fin(false);
    v.src = url;
  });
}

// Convierte un archivo a MP4/H.264. onProgress recibe un % (0-100).
export async function convertirAH264(file, onProgress) {
  const { fetchFile } = await import('@ffmpeg/util');
  const ffmpeg = await cargarFFmpeg();
  const prog = ({ progress }) => {
    if (onProgress) onProgress(Math.max(0, Math.min(99, Math.round(progress * 100))));
  };
  ffmpeg.on('progress', prog);
  try {
    await ffmpeg.writeFile('entrada', await fetchFile(file));
    // Ajuste "Ligero": reescala a 960 px de ancho y comprime algo más
    // (crf 27). En una ecografía la calidad se ve prácticamente igual, pero
    // el archivo queda ~2,5x más pequeño → menos gasto de datos y menos
    // memoria en los equipos de los estudiantes. El video se ve siempre en
    // silencio, así que quitamos el audio (-an) para ahorrar aún más.
    await ffmpeg.exec([
      '-i', 'entrada',
      '-vf', 'scale=960:-2',
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '27', '-pix_fmt', 'yuv420p',
      '-an',
      '-movflags', '+faststart',
      'salida.mp4',
    ]);
    const data = await ffmpeg.readFile('salida.mp4');
    return new Blob([data.buffer], { type: 'video/mp4' });
  } finally {
    ffmpeg.off('progress', prog);
    try { await ffmpeg.deleteFile('entrada'); } catch {}
    try { await ffmpeg.deleteFile('salida.mp4'); } catch {}
  }
}
