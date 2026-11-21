import { useState } from 'react';
import { formatEventDate } from '../../../shared/utils/eventDateTime';
import Reveal from './Reveal';
import { splitNames, nameScale, initials, mediaOf, altFor, knownRatio } from './utils';

// Couverture éditoriale + présentation (invitation, message, tenue). Rend toujours quelque chose, même sans photo.
export default function Cover({ invitation }) {
  const { title, namesLine, eventDate, eventTime, venueName, dressCode, invitationText, personalMessage } = invitation;
  const { cover } = mediaOf(invitation);
  const names = splitNames(namesLine);
  const scale = nameScale(names);
  const longDate = eventDate ? formatEventDate(eventDate, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : null;
  const shortDate = eventDate ? formatEventDate(eventDate, { day: 'numeric', month: 'long', year: 'numeric' }) : null;

  const facts = [
    shortDate && { k: 'Date', v: shortDate },
    eventTime && { k: 'Heure', v: eventTime },
    venueName && { k: 'Lieu', v: venueName },
  ].filter(Boolean);

  const hasIntro = Boolean(invitationText || personalMessage || dressCode);
  // Proportion de la photographie de couverture : celle de l'API si elle est connue, sinon mesurée au chargement.
  // Sert à donner à la colonne photo la forme de l'image (écran large) et donc à ne rien rogner d'important.
  const [measured, setMeasured] = useState(null);
  const ratio = Math.min(1.8, Math.max(0.5, knownRatio(cover) || measured || 0.8));

  return (
    <div>
      <header className={`re-cover re-cover--${scale} re-dark`} style={{ '--cover-ratio': ratio }} aria-label={namesLine ? `Invitation de ${namesLine}` : 'Invitation'}>
        {cover ? (
          <figure className="re-cover__photo">
            <img
              src={cover.url}
              alt={altFor('cover', { namesLine })}
              width={cover.width || undefined}
              height={cover.height || undefined}
              decoding="async"
              fetchpriority="high"
              onLoad={(e) => { const { naturalWidth: w, naturalHeight: h } = e.currentTarget; if (w > 0 && h > 0) setMeasured(w / h); }}
            />
            {longDate && <figcaption className="re-cover__tag">{longDate}</figcaption>}
          </figure>
        ) : (
          <div className="re-cover__mono" aria-hidden="true">
            <span className="re-mono">
              {initials(names).f}
              {initials(names).s && <i>&amp;</i>}
              {initials(names).s}
            </span>
          </div>
        )}

        <div className="re-cover__body">
          <div className="re-cover__top">
            <span className="re-kicker re-kicker--gold">{title}</span>
            {longDate && !cover && <span className="re-kicker">{longDate}</span>}
          </div>

          <h1 className="re-cover__names">
            {names.first ? (
              <>
                <span className="re-cover__name">{names.first}</span>
                {names.second && (
                  <>
                    <span className="re-cover__amp" aria-hidden="true">&amp;</span>
                    <span className="re-sr"> et </span>
                    <span className="re-cover__name">{names.second}</span>
                  </>
                )}
              </>
            ) : (
              <span className="re-cover__name">{title}</span>
            )}
          </h1>

          <div>
            {facts.length > 0 && (
              <dl className={`re-facts re-facts--${facts.length}`} style={{ margin: 0 }}>
                {facts.map((f) => (
                  <div className="re-fact" key={f.k}>
                    <dt>{f.k}</dt>
                    <dd>{f.v}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </div>
      </header>

      {hasIntro && (
        <div className="re-intro re-band">
          <div className="re-wrap re-intro__grid">
            <Reveal className="re-intro__label">
              <span className="re-kicker re-kicker--gold">L'invitation</span>
              {dressCode && (
                <span className="re-chip">
                  <span className="re-sr">Tenue : </span>
                  {dressCode}
                </span>
              )}
            </Reveal>
            <div>
              {invitationText && (
                <Reveal delay={80}>
                  <p className="re-intro__text">{invitationText}</p>
                </Reveal>
              )}
              {personalMessage && (
                <Reveal className="re-intro__quote" delay={120}>
                  <p>{personalMessage}</p>
                </Reveal>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
