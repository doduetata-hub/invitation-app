import { useContext, useState } from 'react';
import Reveal from '../soireeKit/Reveal';
import Pic from '../soireeKit/Pic';
import { formatEventDate } from '../../../shared/utils/eventDateTime';
import { buildMapsQuery } from '../../utils/mapsUrl';
import { splitNames, initials, mediaOf, upFirst } from '../soireeKit/utils';
import { swatchesOf } from '../soireeKit/swatches';
import { useRevisit, afterOpening, OpeningPreview } from '../soireeKit/opening';
import { Divider, Head } from './Ornaments';
import { getText } from './texts';
import Gate from './Gate';
import moonUrl from './assets/moon.webp';
import flightUrl from './assets/flight.webp';
import lanternUrl from './assets/lantern-small.webp';
import frangipaniUrl from './assets/frangipani.webp';

const DEFAULT_TEXT = "C'est avec une immense joie que nous vous convions à partager ce moment unique. Votre présence sera notre plus beau cadeau.";

function Hero({ invitation, entered, preview, onReplay }) {
  const tx = (k) => getText(invitation, k);
  const { title, namesLine, eventDate, eventTime, venueName, guest } = invitation;
  const { cover, photos } = mediaOf(invitation);
  const photo = cover || photos[0] || null;
  const names = splitNames(namesLine);
  const ini = initials(names);
  const valid = eventDate && !Number.isNaN(new Date(eventDate).getTime());
  const dateLong = valid ? formatEventDate(eventDate, { day: 'numeric', month: 'long', year: 'numeric' }) : null;
  const longest = Math.max(names.first.length, names.second ? names.second.length : 0, 5);
  return (
    <header className={`ll-hero${entered ? ' is-in' : ''}${preview ? ' ll-hero--preview' : ''}`} id="top" aria-label={namesLine ? `Invitation de ${namesLine}` : 'Invitation'}>
      {preview && <button type="button" className="ll-replay" onClick={onReplay}>↻ Revoir l'ouverture</button>}
      <img className="ll-hero__flight" src={flightUrl} alt="" aria-hidden="true" decoding="async" />
      <div className="ll-hero__title">
        {guest?.name && <p className="ll-hero__guest ll-rise" style={{ '--i': 0 }}>Cher(e) {guest.name}</p>}
        <h1 className="ll-names" style={{ '--len': longest }}>
          <span className="ll-rise" style={{ '--i': 1 }}>{names.first || title}</span>
          {names.second && (
            <>
              <span className="ll-sr"> et </span>
              <span className="ll-amp ll-rise" style={{ '--i': 2 }} aria-hidden="true">&amp;</span>
              <span className="ll-rise" style={{ '--i': 3 }}>{names.second}</span>
            </>
          )}
        </h1>
        <p className="ll-eyebrow ll-rise" style={{ '--i': 4 }}>{tx('heroEyebrow')}</p>
      </div>
      {/* Le portrait au cœur de la pleine lune, et son reflet sur l'eau */}
      <div className="ll-moon ll-rise" style={{ '--i': 5 }}>
        <img className="ll-moon__disc" src={moonUrl} alt="" aria-hidden="true" decoding="async" />
        {photo ? (
          <div className="ll-moon__photo"><Pic m={photo} eager sizes="(min-width: 700px) 360px, 56vw" alt={namesLine || ''} focal="50% 24%" /></div>
        ) : <span className="ll-mono" aria-hidden="true">{ini.f}{ini.s && <i>&amp;</i>}{ini.s}</span>}
        <span className="ll-moon__water" aria-hidden="true" />
      </div>
      <div className="ll-hero__foot">
        {dateLong && <p className="ll-herodate ll-rise" style={{ '--i': 6 }}>{dateLong}</p>}
        {(eventTime || venueName) && <p className="ll-herovenue ll-rise" style={{ '--i': 7 }}>{[eventTime, venueName].filter(Boolean).join(' · ')}</p>}
        <a className="ll-scroll ll-rise" style={{ '--i': 8 }} href="#invitation"><span>{tx('openLabel')}</span><i aria-hidden="true" /></a>
      </div>
    </header>
  );
}

function Intro({ invitation }) {
  const tx = (k) => getText(invitation, k);
  const { namesLine, invitationText, personalMessage, guest } = invitation;
  const quote = (personalMessage || '').trim().replace(/^[«"“]\s*|\s*[»"”]$/g, '');
  const table = guest?.tableNumber ? String(guest.tableNumber) : '';
  const [seatBefore, seatAfter = ''] = tx('seatText').split('{table}');
  return (
    <section className="ll-intro ll-light" id="invitation" aria-label="Invitation">
      <Reveal className="ll-letter">
        <img className="ll-letter__flower ll-letter__flower--a" src={frangipaniUrl} alt="" aria-hidden="true" loading="lazy" />
        <img className="ll-letter__flower ll-letter__flower--b" src={frangipaniUrl} alt="" aria-hidden="true" loading="lazy" />
        <p className="ll-eyebrow">{tx('introEyebrow')}</p>
        <h2 className="ll-h1">{tx('introTitle')}</h2>
        <Divider />
        <p className="ll-lede">{invitationText || DEFAULT_TEXT}</p>
        {quote && <blockquote className="ll-quote">« {quote} »</blockquote>}
        <p className="ll-sign">{tx('introFooter')}</p>
        {namesLine && <p className="ll-signnames">{namesLine}</p>}
      </Reveal>
      {table && (
        <Reveal className="ll-seat" delay={120}>
          <span className="ll-seat__string" aria-hidden="true" />
          <img src={lanternUrl} alt="" aria-hidden="true" loading="lazy" />
          <p><span>{seatBefore.trim()}</span><b>{table}</b>{seatAfter.trim() && <span>{seatAfter.trim()}</span>}</p>
        </Reveal>
      )}
    </section>
  );
}

function Details({ invitation }) {
  const tx = (k) => getText(invitation, k);
  const { eventDate, eventTime, venueName, address } = invitation;
  const valid = eventDate && !Number.isNaN(new Date(eventDate).getTime());
  const q = buildMapsQuery(invitation);
  if (!valid && !eventTime && !venueName && !address) return null;
  const route = q ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}` : null;
  const items = [
    valid && { key: 'date', label: tx('labelDate'), main: formatEventDate(eventDate, { day: 'numeric', month: 'long' }), sub: `${upFirst(formatEventDate(eventDate, { weekday: 'long' }))} · ${formatEventDate(eventDate, { year: 'numeric' })}` },
    eventTime && { key: 'time', label: tx('labelTime'), main: eventTime },
    (venueName || address) && { key: 'place', label: tx('labelPlace'), main: venueName, sub: address },
  ].filter(Boolean);
  return (
    <section className="ll-details ll-dark" aria-label="Détails">
      <Reveal><Head eyebrow={tx('detailsEyebrow')} title={tx('detailsTitle')} /></Reveal>
      <dl className="ll-hanging">
        {items.map((it, i) => (
          <Reveal className="ll-hang" key={it.key} delay={i * 110}>
            <img src={lanternUrl} alt="" aria-hidden="true" loading="lazy" style={{ '--n': i }} />
            <dt>{it.label}</dt>
            <dd>{it.main && <b>{it.main}</b>}{it.sub && <span>{it.sub}</span>}</dd>
          </Reveal>
        ))}
      </dl>
      {route && <div className="ll-center"><a className="ll-btn" href={route} target="_blank" rel="noopener noreferrer">{tx('routeLink')}<span className="ll-sr"> (nouvel onglet)</span></a></div>}
    </section>
  );
}

function Dress({ invitation }) {
  const code = (invitation.dressCode || '').trim();
  if (!code) return null;
  const tx = (k) => getText(invitation, k);
  const sw = swatchesOf(code);
  // Au moins trois lanternes pour la guirlande, en reprenant uniquement les couleurs demandées.
  const lanterns = sw.length === 0 || sw.length >= 3 ? sw : [0, 1, 2].map((i) => sw[i % sw.length]);
  return (
    <section className="ll-dress ll-light" aria-label="Dress code">
      <Reveal>
        <Head eyebrow={tx('dressEyebrow')} title={tx('dressTitle')} />
        {lanterns.length > 0 && <ul className="ll-paper-lanterns" aria-hidden="true">{lanterns.map((s, i) => <li key={i} style={{ '--c': s.bg, '--k': i % 3 }}><i /></li>)}</ul>}
        <p className="ll-dress__code">{code}</p>
        <p className="ll-dress__t">{tx('dressText')}</p>
      </Reveal>
    </section>
  );
}

// Couverture : l'ouverture à la lanterne, puis le portrait dans la lune, l'invitation, les détails et le dress code.
export default function Cover({ invitation }) {
  const isPublic = typeof window !== 'undefined' && /^\/i\//.test(window.location.pathname);
  const preview = useContext(OpeningPreview);
  // Obligatoire à chaque visite de l'invité ; dans l'administration, ouvrir le modèle commence aussi par elle (voir soireeKit/opening.js).
  const [gate, setGate] = useState(isPublic ? 'page' : preview === 'visit' ? 'preview' : null);
  useRevisit(isPublic, () => setGate('page')); // et à chaque retour sur l'invitation
  return (
    <>
      <div className="ll-cover">
        {gate && <Gate invitation={invitation} mode={gate === 'inline' ? 'inline' : 'page'} preview={gate === 'preview'} onDone={() => { setGate(null); if (gate === 'page') afterOpening(); }} />}
        <Hero invitation={invitation} entered={!gate} preview={!isPublic && preview !== 'thumbnail'} onReplay={() => setGate(preview === 'visit' ? 'preview' : 'inline')} />
      </div>
      <Intro invitation={invitation} />
      <Details invitation={invitation} />
      <Dress invitation={invitation} />
    </>
  );
}
