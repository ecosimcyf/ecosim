'use client';
// Revela las secciones marcadas con data-reveal a medida que entran en
// pantalla (fade + subida leve). Sin parallax ni scroll-jacking — solo un
// fundido.
//
// Progressive enhancement: en globals.css, [data-reveal] arranca VISIBLE
// (opacity:1). Solo cuando este componente confirma que puede animar
// agrega la clase "reveal-armar" (que recién ahí arranca invisible) y
// después "is-visible" al entrar en pantalla. Si JS no corre, tarda, o el
// navegador no tiene IntersectionObserver, el contenido —incluido el
// formulario de contacto— ya estaba visible desde el primer render y
// nunca se oculta. También respeta prefers-reduced-motion (ahí ni se
// arma: se deja tal cual, visible).
import { useEffect } from 'react';

export default function ScrollReveal() {
  useEffect(() => {
    const elementos = document.querySelectorAll('[data-reveal]');
    if (!elementos.length) return;

    if (
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      typeof IntersectionObserver === 'undefined'
    ) {
      return;
    }

    elementos.forEach((el) => el.classList.add('reveal-armar'));

    const observer = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((entrada) => {
          if (entrada.isIntersecting) {
            entrada.target.classList.add('is-visible');
            observer.unobserve(entrada.target);
          }
        });
      },
      { threshold: 0 }
    );
    elementos.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return null;
}
