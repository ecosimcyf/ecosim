// Textos de las pantallas de error (src/app/**/error.js y global-error.js).
// Aparecen cuando algo falló al pintar la página, así que no pueden
// depender del resto de la app: el idioma se toma del <html lang>.
export const ERRORES = {
  es: {
    titulo: 'Algo salió mal',
    texto: 'No se pudo mostrar esta pantalla. Ya quedó registrado para revisarlo.',
    textoEstudiante: 'No se pudo mostrar el caso. Prueba de nuevo; si sigue pasando, avísale a tu profesor.',
    reintentar: 'Reintentar',
    recargar: 'Recargar la página',
    inicio: 'Ir al inicio',
  },
  pt: {
    titulo: 'Algo deu errado',
    texto: 'Não foi possível mostrar esta tela. O erro já foi registrado para análise.',
    textoEstudiante: 'Não foi possível mostrar o caso. Tente de novo; se continuar, avise o seu professor.',
    reintentar: 'Tentar novamente',
    recargar: 'Recarregar a página',
    inicio: 'Ir para o início',
  },
  en: {
    titulo: 'Something went wrong',
    texto: 'This screen couldn’t be shown. The error has been logged for review.',
    textoEstudiante: 'The case couldn’t be shown. Please try again; if it keeps happening, tell your instructor.',
    reintentar: 'Try again',
    recargar: 'Reload the page',
    inicio: 'Go to the home page',
  },
};

// 'pt-BR' -> 'pt'
export function idiomaDelDocumento() {
  if (typeof document === 'undefined') return 'es';
  const l = (document.documentElement.lang || 'es').slice(0, 2);
  return ERRORES[l] ? l : 'es';
}
