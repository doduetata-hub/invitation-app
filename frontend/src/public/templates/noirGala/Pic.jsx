import { isVideo } from './utils';

// Photographie d'un média de l'invitation : variante légère (800 px) quand elle existe, image principale sinon.
export default function Pic({ m, sizes = '50vw', className = '', eager = false }) {
  if (!m || isVideo(m)) return null;
  const hasVariant = Boolean(m.thumbUrl) && !(m.width && m.width <= 800);
  return (
    <img
      className={className}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      sizes={hasVariant ? sizes : undefined}
      srcSet={hasVariant ? `${m.thumbUrl} 800w, ${m.url} ${m.width || 1200}w` : undefined}
      src={m.url}
      alt=""
      width={m.width || undefined}
      height={m.height || undefined}
    />
  );
}
