import { useEffect, useRef, useState } from 'react';
import { injectStylesOnce } from '../../utils/injectStyles';

injectStylesOnce(
  'luxury-gold-reveal',
  `
  .lux-reveal { opacity: 0; transform: translateY(22px); transition: opacity 750ms ease-out, transform 750ms ease-out; }
  .lux-reveal--visible { opacity: 1; transform: translateY(0); }
  @media (prefers-reduced-motion: reduce) {
    .lux-reveal, .lux-reveal--visible { opacity: 1; transform: none; transition: none; }
  }
  `
);

export default function RevealOnScroll({ children, as: Tag = 'div' }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag ref={ref} className={`lux-reveal${visible ? ' lux-reveal--visible' : ''}`}>
      {children}
    </Tag>
  );
}
