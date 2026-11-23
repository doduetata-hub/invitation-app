import Reveal from './Reveal';
import { formatEventDate } from '../../../shared/utils/eventDateTime';
import { buildMapsQuery } from '../../utils/mapsUrl';
import { splitNames, initials, mediaOf, pick, pad2, upFirst, monthGrid, WEEKDAYS, tearPoints } from './utils';
import { Corner, Flourish, Icon } from './icons';
import Pic from './Pic';

const TEAR = tearPoints(11, 28, 2.2);
// Deux photos de 52 % de large, bord contre bord ; la déchirure blanche est le bord irrégulier de chacune (en % de SA propre largeur).
const polyLeft = `polygon(0 0, ${TEAR.map(([, d], i) => `${96 + d}% ${(i / (TEAR.length - 1)) * 100}%`).join(', ')}, 0 100%)`;
const polyRight = `polygon(100% 0, ${TEAR.map(([, d], i) => `${4.5 + d}% ${(i / (TEAR.length - 1)) * 100}%`).join(', ')}, 100% 100%)`;

// Bord déchiré en bas de la photo, de la couleur du papier.
const EDGE = (() => {
  const pts = tearPoints(5, 34, 1);
  return `M0 40 L0 ${(20 + pts[0][1] * 12).toFixed(1)} ${pts.map(([x, d]) => `L${(x * 4).toFixed(1)} ${(20 + d * 12).toFixed(1)}`).join(' ')} L400 40 Z`;
})();
function TornBottom() {
  return <svg className="sk-torn" viewBox="0 0 400 40" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d={EDGE} /></svg>;
}

function DateRow({ eventDate }) {
  const d = new Date(eventDate);
  return (
    <div className="sk-date" role="text" aria-label={formatEventDate(eventDate, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}>
      <span aria-hidden="true"><b>{pad2(d.getUTCDate())}</b><i /><b className="is-mid">{pad2(d.getUTCMonth() + 1)}</b><i /><b>{String(d.getUTCFullYear()).slice(-2)}</b></span>
      <Flourish className="sk-date__fl" />
    </div>
  );
}

// ---- Couvertures : trois compositions pour les trois templates ----
function Hero({ invitation, variant }) {
  const { eventDate, namesLine, title } = invitation;
  const { cover, photos } = mediaOf(invitation);
  const main = cover || photos[0] || null;
  const second = cover ? photos[0] : photos[1];
  const names = splitNames(namesLine);
  const ini = initials(names);
  const valid = eventDate && !Number.isNaN(new Date(eventDate).getTime());
  const alt = namesLine || '';

  if (variant === 'fade') {
    return (
      <header className="sk-hero sk-hero--fade" aria-label={namesLine ? `Invitation de ${namesLine}` : 'Invitation'}>
        <div className="sk-hero__photo">
          {main ? <Pic m={main} eager sizes="(min-width: 800px) 640px, 100vw" alt={alt} focal="50% 22%" /> : <div className="sk-mono" aria-hidden="true">{ini.f}{ini.s}</div>}
        </div>
        <Corner kind="rose" className="sk-corner--l" />
        <Corner kind="rose" className="sk-corner--r" />
        <div className="sk-hero__title">
          <h1>
            <span className="sk-hero__the sk-rise" style={{ '--i': 1 }}>the</span>
            <span className="sk-hero__big sk-rise" style={{ '--i': 0 }}>SAVE</span>
            <span className="sk-hero__big sk-rise" style={{ '--i': 1 }}>DATE</span>
          </h1>
          {title && <p className="sk-hero__sub sk-rise" style={{ '--i': 2 }}>{title}</p>}
          <Flourish className="sk-rise" />
        </div>
      </header>
    );
  }

  const split = variant === 'split' && main && second;
  return (
    <header className={`sk-hero sk-hero--${variant}`} aria-label={namesLine ? `Invitation de ${namesLine}` : 'Invitation'}>
      <div className="sk-hero__top">
      {split ? (
        <div className="sk-split">
          <div className="sk-split__a" style={{ clipPath: polyLeft }}><Pic m={main} eager sizes="(min-width: 800px) 360px, 55vw" alt={alt} focal="50% 16%" /></div>
          <div className="sk-split__b" style={{ clipPath: polyRight }}><Pic m={second} eager sizes="(min-width: 800px) 360px, 55vw" focal="50% 16%" /></div>
        </div>
      ) : (
        <div className="sk-single">
          {main ? <Pic m={main} eager sizes="(min-width: 800px) 640px, 100vw" alt={alt} focal="50% 24%" /> : <div className="sk-mono" aria-hidden="true">{ini.f}{ini.s}</div>}
        </div>
      )}
      <TornBottom />
      <Corner kind="blossom" className="sk-corner--l" />
      <Corner kind="blossom" className="sk-corner--r" />
      </div>
      {valid && <Reveal className="sk-hero__datewrap"><DateRow eventDate={eventDate} /></Reveal>}
    </header>
  );
}

// Salutation (nom de l'invité s'il est identifié), noms et texte d'invitation : uniquement les données de l'invitation.
function Intro({ invitation, variant }) {
  const { namesLine, invitationText, personalMessage, guest } = invitation;
  const text = invitationText || 'Ont la joie de vous convier à la célébration de leur union.';
  const names = splitNames(namesLine);
  return (
    <section className="sk-intro" aria-label="Invitation">
      <Reveal>
        {guest?.name && <p className="sk-guest">{guest.name}</p>}
        {guest?.name && <span className="sk-rule" aria-hidden="true" />}
        {variant === 'fade' ? (
          <>
            <p className="sk-lead">Nous avons la joie de vous convier à célébrer l'union de</p>
            <h2 className="sk-names sk-names--script">{names.second ? <>{names.first} <em>&amp;</em> {names.second}</> : namesLine}</h2>
          </>
        ) : (
          namesLine && <h2 className="sk-names">{names.second ? <>{names.first} <em>&amp;</em> {names.second}</> : namesLine}</h2>
        )}
        {namesLine && variant !== 'fade' && <span className="sk-rule" aria-hidden="true" />}
        <p className="sk-text">{text}</p>
        {personalMessage && <p className="sk-text sk-text--em">{personalMessage}</p>}
      </Reveal>
    </section>
  );
}

// Calendrier du mois, jour de l'événement cerclé de rouge-cœur, à côté (ou sur) une photo du couple.
function SaveDate({ invitation, variant }) {
  const { eventDate } = invitation;
  if (!eventDate) return null;
  const { photos } = mediaOf(invitation);
  const photo = pick(photos, 1);
  const { cells, day } = monthGrid(eventDate);
  const month = upFirst(formatEventDate(eventDate, { month: 'long', year: 'numeric' }));
  const long = formatEventDate(eventDate, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <section className={`sk-std sk-std--${variant}${photo ? ' has-photo' : ''}`} aria-label="Save the date">
      <Reveal><h2 className="sk-script sk-h2">Save The Date</h2><Flourish /></Reveal>
      <Reveal className="sk-std__band" delay={80}>
        {photo && <div className="sk-std__photo"><Pic m={photo} sizes="(min-width: 800px) 420px, 50vw" focal="50% 22%" /></div>}
        <div className="sk-cal" role="img" aria-label={`Calendrier : ${long}`}>
          <p className="sk-cal__month">{month}</p>
          <div className="sk-cal__grid" aria-hidden="true">
            {WEEKDAYS.map((w) => <span className="sk-cal__wd" key={w}>{w}</span>)}
            {cells.map((c, i) => <span key={i} className={`sk-cal__d${c === day ? ' is-day' : ''}`}>{c}</span>)}
          </div>
        </div>
      </Reveal>
    </section>
  );
}

// Carte « soirée » : photo, heure, lieu, adresse et itinéraire.
function EventCard({ invitation }) {
  const { eventTime, venueName, address, title } = invitation;
  if (!eventTime && !venueName && !address) return null;
  const { photos } = mediaOf(invitation);
  const photo = pick(photos, 2);
  const q = buildMapsQuery(invitation);
  const route = q ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}` : null;
  return (
    <section className="sk-evt" aria-label="Lieu et heure">
      <Reveal className="sk-evt__card">
        {photo && <div className="sk-evt__photo"><Pic m={photo} sizes="(min-width: 800px) 420px, 80vw" focal="50% 18%" /></div>}
        {eventTime && <p className="sk-evt__time">À {String(eventTime).toUpperCase()}</p>}
        {title && <p className="sk-evt__title">{title}</p>}
        {venueName && <p className="sk-evt__venue">{venueName}</p>}
        {address && (
          <p className="sk-evt__addr"><Icon name="pin" className="sk-icon sk-icon--pin" />{address}</p>
        )}
        {route && <a className="sk-btn" href={route} target="_blank" rel="noopener noreferrer">Voir l'itinéraire<Icon name="arrow" className="sk-icon sk-icon--sm" /><span className="sk-sr"> (nouvel onglet)</span></a>}
      </Reveal>
    </section>
  );
}

export default function Cover({ invitation, variant = 'split', calendar = 'dark' }) {
  return (
    <div>
      <Hero invitation={invitation} variant={variant} />
      <Intro invitation={invitation} variant={variant} />
      <SaveDate invitation={invitation} variant={calendar} />
      <EventCard invitation={invitation} />
    </div>
  );
}
