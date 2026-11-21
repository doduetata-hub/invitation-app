import Reveal from '../royalEditorial/Reveal';
import { formatEventDate } from '../../../shared/utils/eventDateTime';
import { splitNames, nameScale, initials, mediaOf, parseDressCode, pad2 } from './utils';
import { Sprig, TornEdge } from './ornaments';
import Pic from './Pic';

const upFirst = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

// Couverture plein écran (photo sous voile noir, bord déchiré, noms décalés) puis faire-part : message, collage en arches, dress code.
export default function Cover({ invitation }) {
  const { title, namesLine, eventDate, eventTime, venueName, invitationText, personalMessage, dressCode } = invitation;
  const { cover, gallery } = mediaOf(invitation);
  const names = splitNames(namesLine);
  const ini = initials(names);
  const d = eventDate ? new Date(eventDate) : null;
  const valid = d && !Number.isNaN(d.getTime());
  const weekday = valid ? upFirst(formatEventDate(eventDate, { weekday: 'long' })) : null;
  const dress = parseDressCode(dressCode);
  const intro = invitationText || (names.first ? 'Ont la joie de vous convier à la célébration de leur union.' : '');
  const photos = gallery.filter((m) => !(m.mimeType || '').startsWith('video/'));

  return (
    <div>
      <header className="ng-cover" aria-label={namesLine ? `Invitation de ${namesLine}` : 'Invitation'}>
        {cover ? (
          <img className="ng-cover__bg" src={cover.url} alt="" decoding="async" fetchpriority="high" />
        ) : (
          <div className="ng-cover__bg ng-cover__bg--mono" aria-hidden="true">
            <span>{ini.f}{ini.s && <i>&amp;</i>}{ini.s}</span>
          </div>
        )}
        <div className="ng-cover__veil" aria-hidden="true" />
        <div className="ng-cover__frame" aria-hidden="true" />
        <TornEdge />

        <div className="ng-cover__inner">
          <p className="ng-script ng-script--sm ng-rise" style={{ '--i': 0 }}>{title || 'Invitation'}</p>
          <div className="ng-cover__center">
            <h1 className={`ng-names ng-names--${nameScale(names)}`}>
              <span className="ng-name ng-name--a ng-rise" style={{ '--i': 1 }}>{names.first || title}</span>
              {names.second && (
                <>
                  <span className="ng-amp ng-rise" style={{ '--i': 2 }} aria-hidden="true">&amp;</span>
                  <span className="ng-sr"> et </span>
                  <span className="ng-name ng-name--b ng-rise" style={{ '--i': 3 }}>{names.second}</span>
                </>
              )}
            </h1>
            {valid && (
              <div className="ng-date ng-rise" style={{ '--i': 4 }}>
                <span className="ng-script ng-date__wd">{weekday}</span>
                <span className="ng-date__row" aria-hidden="true">
                  <b>{pad2(d.getUTCDate())}</b><i />
                  <b>{pad2(d.getUTCMonth() + 1)}</b><i />
                  <b>{d.getUTCFullYear()}</b>
                </span>
                <span className="ng-sr">{formatEventDate(eventDate, { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                {(eventTime || venueName) && <span className="ng-date__meta">{[eventTime && `à ${eventTime}`, venueName].filter(Boolean).join(' — ')}</span>}
              </div>
            )}
          </div>
          <a className="ng-scroll ng-rise" style={{ '--i': 6 }} href="#countdown" aria-label="Découvrir l'invitation"><span /></a>
        </div>
      </header>

      <section className="ng-intro" aria-label="Invitation">
        <Sprig className="ng-sprig--tl" flip />
        <Sprig className="ng-sprig--br" flip />
        <div className="ng-intro__in">
          <Reveal><h2 className="ng-script ng-foil ng-script--lg">Vous êtes invités</h2></Reveal>
          {intro && <Reveal delay={90}><p className="ng-lede">{intro}</p></Reveal>}
          {personalMessage && <Reveal delay={160}><p className="ng-quote">{personalMessage}</p></Reveal>}

          {photos.length >= 2 && (
            <Reveal className="ng-duo" delay={80}>
              <figure className="ng-arch ng-duo__a"><Pic m={photos[0]} sizes="(min-width: 700px) 280px, 52vw" /></figure>
              <figure className="ng-arch ng-duo__b"><Pic m={photos[1]} sizes="(min-width: 700px) 240px, 44vw" /></figure>
            </Reveal>
          )}

          {dress && (
            <Reveal className="ng-dress" delay={120}>
              <h3 className="ng-script ng-script--md">Dress code</h3>
              {dress.swatches.length > 0 && (
                <span className="ng-rings" aria-hidden="true">
                  {[dress.swatches[0], dress.swatches[1] || dress.swatches[0]].map((c, i) => <i key={i} style={{ '--c': c }} />)}
                </span>
              )}
              <p className="ng-dress__txt">{upFirst(dress.text)}</p>
            </Reveal>
          )}
        </div>
      </section>
    </div>
  );
}
