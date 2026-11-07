// Texto del correo de aviso de errores (ver aviso-errores.js). Sin
// dependencias, para probarlo con `npm test`.

export const PAUSA_MIN = 30;             // como mucho un aviso cada 30 minutos
export const MIN_NAVEGADOR = 3;          // errores del navegador necesarios…
export const VENTANA_NAVEGADOR_MIN = 10; // …en estos minutos para avisar

// filas: errores recientes [{ origen, mensaje, creado_en }] (más nuevo
// primero), o null si la base no respondió.
export function resumenErrores(filas, { sitio, origen, mensaje }) {
  const panel = (sitio || '').replace(/\/$/, '') + '/admin';
  if (!filas) {
    return {
      asunto: 'EcoSim: la base de datos no responde',
      texto: [
        'La app registró un error y además no pudo consultar la base de datos (Supabase).',
        'Puede que Supabase esté caído, pausado o sin cupo. Revisa su panel y el de Vercel.',
        '',
        `Último error (${origen}): ${mensaje}`,
        '',
        'Estado en vivo: ' + (sitio || '').replace(/\/$/, '') + '/api/salud',
      ].join('\n'),
    };
  }
  const porOrigen = new Map();
  for (const f of filas) {
    const g = porOrigen.get(f.origen) || { n: 0, ejemplo: f.mensaje };
    g.n++;
    porOrigen.set(f.origen, g);
  }
  const grupos = [...porOrigen.entries()].sort((a, b) => b[1].n - a[1].n);
  const total = filas.length;
  const lineas = grupos.slice(0, 10).map(([o, g]) => `• ${o} — ${g.n} ${g.n === 1 ? 'vez' : 'veces'}\n  «${String(g.ejemplo).slice(0, 200)}»`);
  if (grupos.length > 10) lineas.push(`• … y ${grupos.length - 10} tipo(s) más`);
  return {
    asunto: `EcoSim: ${total} error${total === 1 ? '' : 'es'} en los últimos ${PAUSA_MIN} minutos`,
    texto: [
      `En los últimos ${PAUSA_MIN} minutos la app registró ${total} error${total === 1 ? '' : 'es'}:`,
      '',
      ...lineas,
      '',
      'El detalle completo está en el panel → pestaña «Errores»: ' + panel,
      `(Siguiente aviso, como pronto, en ${PAUSA_MIN} minutos.)`,
    ].join('\n'),
  };
}
