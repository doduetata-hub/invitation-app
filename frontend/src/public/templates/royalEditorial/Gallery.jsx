import { useCallback, useEffect, useMemo, useState } from 'react';
import Reveal from './Reveal';
import Lightbox from './Lightbox';
import { mediaOf, isVideo, knownRatio, altFor } from './utils';

const THUMB_WIDTH = 800; // largeur de la variante enregistrée par le backend (image.service.js : GALLERY_VARIANT_WIDTH)
const MAIN_WIDTH_FALLBACK = 1200; // largeur maximale de l'image principale quand ses dimensions ne sont pas connues
const FALLBACK_RATIO = 0.75; // proportion réservée tant que la vraie est inconnue (la plupart des photographies sont des portraits)

// Rythme éditorial : nombre de photographies par rangée, répété. Trois « bandes » d'écran.
//  mobile  : 1 grande, puis 2, puis 2     — lecture verticale, jamais de vignette minuscule
//  tablette: 2, 1 grande, 2
//  bureau  : 3, 2                          — rangées pleines (aucun grand vide à côté d'une photo seule)
const CYCLES = { mobile: [1, 2, 2], tablet: [2, 1, 2], desktop: [3, 2] };

function useBand() {
  const get = () => {
    if (typeof window === 'undefined' || !window.matchMedia) return 'desktop';
    if (window.matchMedia('(min-width: 1100px)').matches) return 'desktop';
    if (window.matchMedia('(min-width: 640px)').matches) return 'tablet';
    return 'mobile';
  };
  const [band, setBand] = useState(get);
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const qs = [window.matchMedia('(min-width: 1100px)'), window.matchMedia('(min-width: 640px)')];
    const on = () => setBand(get());
    qs.forEach((q) => q.addEventListener?.('change', on));
    return () => qs.forEach((q) => q.removeEventListener?.('change', on));
  }, []);
  return band;
}

// Largeur réelle d'une tuile (pour l'attribut `sizes`), d'après la mise en page : conteneur à marges de 5 vw (max 1480 px), écart entre
// tuiles ~2 vw. Mobile : 1 photo = pleine largeur, 2 photos = moitié ; tablette : paire = moitié, temps fort borné à 36 rem ;
// bureau : trio ~ 29 vw (max 475 px), paire ~ 44 vw (max 726 px).
export function sizesFor(band, rowSize) {
  if (band === 'mobile') return rowSize === 1 ? 'calc(100vw - 40px)' : 'calc(50vw - 25px)';
  if (band === 'tablet') return rowSize === 1 ? 'min(36rem, 90vw)' : '44vw';
  return rowSize === 3 ? 'min(29vw, 475px)' : rowSize === 2 ? 'min(44vw, 726px)' : 'min(36rem, 45vw)';
}

/** Découpe N éléments en rangées selon le cycle ; la dernière rangée est ce qui reste (une photo seule = temps fort final). */
export function buildRows(count, cycle) {
  const rows = [];
  let i = 0;
  let c = 0;
  while (i < count) {
    const size = Math.min(cycle[c % cycle.length], count - i);
    rows.push({ start: i, size, feature: size === 1 });
    i += size;
    c += 1;
  }
  return rows;
}

function Tile({ m, index, total, ratio, sizes, onOpen, onMeasured, namesLine, flex }) {
  const [failed, setFailed] = useState(false);
  const alt = altFor('gallery', { index, total, namesLine });
  // Variante légère de l'application (Media.thumbUrl : 800 px de large, mêmes proportions) : le navigateur choisit lui-même, selon la
  // largeur réelle de la tuile et la densité de l'écran, entre cette variante et l'image principale (1200 px). Une photo qui n'a pas
  // de variante (anciennes photos, image déjà étroite) garde son simple `src`.
  const hasVariant = Boolean(m.thumbUrl) && !isVideo(m) && !(m.width && m.width <= THUMB_WIDTH);
  const srcSet = hasVariant ? `${m.thumbUrl} ${THUMB_WIDTH}w, ${m.url} ${m.width || MAIN_WIDTH_FALLBACK}w` : undefined;
  return (
    <button
      type="button"
      className="re-gal__item"
      style={{ flex: `${ratio} 1 0` }}
      onClick={() => onOpen(index)}
      aria-label={`Agrandir : ${alt}`}
      data-flex={flex}
    >
      <span className="re-gal__frame" style={{ aspectRatio: String(ratio) }}>
        {failed ? (
          <span className="re-gal__fail">Photographie indisponible</span>
        ) : isVideo(m) ? (
          <video src={m.url} muted playsInline preload="metadata" aria-hidden="true" tabIndex={-1} onLoadedMetadata={(e) => onMeasured(m, e.currentTarget.videoWidth, e.currentTarget.videoHeight)} />
        ) : (
          // ORDRE DES ATTRIBUTS : React les pose dans l'ordre. `loading`, `sizes` et `srcSet` doivent précéder `src`, sinon le navigateur
          // démarre le téléchargement de l'image pleine taille (src) puis l'abandonne (ERR_ABORTED) au profit de la vignette.
          <img
            loading="lazy"
            decoding="async"
            sizes={srcSet ? sizes : undefined}
            srcSet={srcSet}
            src={m.url}
            alt=""
            width={m.width || undefined}
            height={m.height || undefined}
            onLoad={(e) => onMeasured(m, e.currentTarget.naturalWidth, e.currentTarget.naturalHeight)}
            onError={() => setFailed(true)}
          />
        )}
      </span>
      <span className="re-gal__no" aria-hidden="true" data-no={String(index + 1).padStart(2, '0')} />
    </button>
  );
}

// Galerie éditoriale : rangées « justifiées » — dans une rangée les photographies ont la MÊME HAUTEUR et une largeur proportionnelle à
// leur format d'origine (aucun recadrage, aucune déformation, aucune colonne qui finit avant les autres, aucun vide). Le rythme alterne
// rangées de 3, de 2 et une photographie « temps fort » ; la 2e photo d'une rangée est décalée vers le bas (asymétrie).
export default function Gallery({ invitation }) {
  const { gallery } = mediaOf(invitation);
  const [measured, setMeasured] = useState({});
  const [open, setOpen] = useState(null);
  const band = useBand();

  const onMeasured = useCallback((m, w, h) => {
    if (w > 0 && h > 0) setMeasured((s) => (s[m.url] ? s : { ...s, [m.url]: w / h }));
  }, []);

  const total = gallery.length;
  const rows = useMemo(() => buildRows(total, CYCLES[band]), [total, band]);
  const items = useMemo(() => gallery.map((m, i) => ({ ...m, alt: altFor('gallery', { index: i, total, namesLine: invitation.namesLine }) })), [gallery, total, invitation.namesLine]);

  if (total === 0) return null;
  const ratioOf = (m) => knownRatio(m) || measured[m.url] || FALLBACK_RATIO;

  return (
    <div className="re-dark re-band">
      <div className="re-wrap">
        <div className="re-gal__head">
          <Reveal className="re-sectionhead" style={{ marginBottom: 0 }}>
            <span className="re-kicker re-kicker--gold">Portfolio</span>
            <h2 className="re-h2">La galerie</h2>
          </Reveal>
          <p className="re-kicker re-muted">{total} {total > 1 ? 'images' : isVideo(gallery[0]) ? 'vidéo' : 'image'}</p>
        </div>

        <div className={`re-gal re-gal--${band}`}>
          {rows.map((row, r) => {
            const slice = gallery.slice(row.start, row.start + row.size);
            const sizes = sizesFor(band, row.size);
            return (
              <Reveal key={row.start} className={`re-gal__row re-gal__row--${row.size}${row.feature ? ` is-feature is-feature-${r % 2 ? 'right' : 'left'}` : ''}`}>
                {slice.map((m, k) => (
                  <Tile
                    key={m.id || m.url}
                    m={m}
                    index={row.start + k}
                    total={total}
                    ratio={ratioOf(m)}
                    sizes={sizes}
                    onOpen={setOpen}
                    onMeasured={onMeasured}
                    namesLine={invitation.namesLine}
                  />
                ))}
              </Reveal>
            );
          })}
        </div>
      </div>
      {open !== null && <Lightbox items={items} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />}
    </div>
  );
}
