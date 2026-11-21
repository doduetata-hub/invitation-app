import Reveal from '../royalEditorial/Reveal';
import { formatEventDate } from '../../../shared/utils/eventDateTime';
import { splitNames, initials, mediaOf, parseDressCode, pad2 } from './utils';

// Couverture plein écran : photo (ou monogramme) sous voile noir, noms monumentaux, date en trois blocs, cadre doré.
export default function Cover({ invitation }) {
  const { title, namesLine, eventDate, eventTime, invitationText, personalMessage, dressCode } = invitation;
  const { cover } = mediaOf(invitation);
  const names = splitNames(namesLine);
  const ini = initials(names);
  const d = eventDate ? new Date(eventDate) : null;
  const valid = d && !Number.isNaN(d.getTime());
  const weekday = valid ? formatEventDate(eventDate, { weekday: 'long' }) : null;
  const dress = parseDressCode(dressCode);
  const intro = invitationText || (names.first ? 'Ont la joie de vous convier à la célébration de leur union.' : '');

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
        <div className="ng-cover__grain" aria-hidden="true" />
        <div className="ng-cover__frame" aria-hidden="true" />

        <div className="ng-cover__inner">
          <p className="ng-kicker ng-rise" style={{ '--i': 0 }}>{title || 'Invitation'}</p>
          <div className="ng-cover__center">
            <h1 className="ng-names">
              <span className="ng-name ng-rise" style={{ '--i': 1 }}>{names.first || title}</span>
              {names.second && (
                <>
                  <span className="ng-amp ng-rise" style={{ '--i': 2 }} aria-hidden="true">&amp;</span>
                  <span className="ng-sr"> et </span>
                  <span className="ng-name ng-rise" style={{ '--i': 3 }}>{names.second}</span>
                </>
              )}
            </h1>
            {valid && (
              <div className="ng-date ng-rise" style={{ '--i': 4 }}>
                <span className="ng-date__wd">{weekday}</span>
                <span className="ng-date__row" aria-hidden="true">
                  <b>{pad2(d.getUTCDate())}</b><i />
                  <b>{pad2(d.getUTCMonth() + 1)}</b><i />
                  <b>{pad2(d.getUTCFullYear() % 100)}</b>
                </span>
                <span className="ng-sr">{formatEventDate(eventDate, { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                {eventTime && <span className="ng-date__time">à {eventTime}</span>}
              </div>
            )}
          </div>
          <a className="ng-scroll ng-rise" style={{ '--i': 6 }} href="#countdown" aria-label="Découvrir l'invitation"><span /></a>
        </div>
      </header>

      <section className="ng-band ng-intro" aria-label="Invitation">
        <Reveal><span className="ng-orn" aria-hidden="true" /></Reveal>
        <Reveal delay={80}><p className="ng-kicker">Vous êtes cordialement invités</p></Reveal>
        {intro && <Reveal delay={140}><p className="ng-lede">{intro}</p></Reveal>}
        {personalMessage && <Reveal delay={200}><p className="ng-quote">{personalMessage}</p></Reveal>}
        {dress && (
          <Reveal className="ng-dress" delay={260}>
            <span className="ng-kicker">Dress code</span>
            {dress.swatches.length > 0 && (
              <span className="ng-dress__sw" aria-hidden="true">
                {dress.swatches.map((c, i) => <i key={i} style={{ background: c }} />)}
              </span>
            )}
            <span className="ng-dress__txt">{dress.text}</span>
          </Reveal>
        )}
      </section>
    </div>
  );
}
