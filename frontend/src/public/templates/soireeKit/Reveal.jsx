import { useEffect, useLayoutEffect, useRef, useState } from 'react';

// Révélation progressive — JAMAIS indispensable à la visibilité du contenu :
//  - par défaut (premier rendu, éléments déjà à l'écran, prefers-reduced-motion, pas d'IntersectionObserver) le contenu est visible ;
//  - seuls les éléments situés SOUS la ligne de flottaison sont « armés » (masqués) puis révélés quand ils approchent de l'écran ;
//  - trois filets de sécurité indépendants révèlent l'élément si l'observateur ne fait pas son travail :
//      1. écouteur de défilement/redimensionnement (test de position direct, sans observateur) ;
//      2. délai de garde : si l'observateur n'a produit AUCUN rappel après 1,5 s, tout est révélé ;
//      3. délai de garde final : tout est révélé après 8 s quoi qu'il arrive.
const NEAR = 0.94; // fraction de la hauteur d'écran à partir de laquelle un élément est considéré « en vue »

export default function Reveal({ as: Tag = 'div', className = '', delay = 0, children, style, ...rest }) {
  const ref = useRef(null);
  const [phase, setPhase] = useState('visible'); // visible (défaut) | armed | shown

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof window === 'undefined') return;
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || typeof IntersectionObserver === 'undefined') return;
    if (el.getBoundingClientRect().top < window.innerHeight * NEAR) return; // déjà en vue : on ne masque rien
    setPhase('armed');
  }, []);

  useEffect(() => {
    if (phase !== 'armed') return undefined;
    const el = ref.current;
    let done = false;
    let alive = false;
    const show = () => {
      if (done) return;
      done = true;
      setPhase('shown');
      cleanup();
    };
    const check = () => {
      if (el && el.getBoundingClientRect().top < window.innerHeight * NEAR) show();
    };
    const io = new IntersectionObserver(
      (entries) => {
        alive = true;
        if (entries.some((e) => e.isIntersecting)) show();
      },
      { rootMargin: '0px 0px -6% 0px', threshold: 0.01 }
    );
    io.observe(el);
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check, { passive: true });
    const t1 = setTimeout(() => { if (!alive) show(); }, 1500);
    const t2 = setTimeout(show, 8000);
    function cleanup() {
      io.disconnect();
      window.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
      clearTimeout(t1);
      clearTimeout(t2);
    }
    check();
    return cleanup;
  }, [phase]);

  const cls = `re-reveal${phase === 'armed' ? ' is-armed' : phase === 'shown' ? ' is-shown' : ''}${className ? ` ${className}` : ''}`;
  return (
    <Tag ref={ref} className={cls} style={delay ? { ...style, '--d': `${delay}ms` } : style} {...rest}>
      {children}
    </Tag>
  );
}
