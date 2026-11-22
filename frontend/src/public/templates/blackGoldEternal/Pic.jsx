import { isVideo, focalOf } from './utils';

// Photographie d'un média : variante légère (800 px) quand elle existe, image principale sinon.
// object-position suit le point focal de la photo : le recadrage ne coupe jamais les visages.
export default function Pic({ m, sizes = '50vw', className = '', eager = false, focal, alt = '' }) {
  if (!m || isVideo(m)) return null;
  const hasVariant = Boolean(m.thumbUrl) && !(m.width && m.width <= 800);
  return (
    <img
      className={className}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      fetchpriority={eager ? 'high' : undefined}
      sizes={hasVariant ? sizes : undefined}
      srcSet={hasVariant ? `${m.thumbUrl} 800w, ${m.url} ${m.width || 1200}w` : undefined}
      src={m.url}
      alt={alt}
      width={m.width || undefined}
      height={m.height || undefined}
      style={{ objectPosition: focal || focalOf(m) }}
    />
  );
}
