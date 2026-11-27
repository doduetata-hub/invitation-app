import { useContext, useState } from 'react';
import Reveal from '../soireeKit/Reveal';
import Pic from '../soireeKit/Pic';
import { formatEventDate } from '../../../shared/utils/eventDateTime';
import { buildMapsQuery } from '../../utils/mapsUrl';
import { mediaOf, upFirst } from '../soireeKit/utils';
import { swatchesOf } from '../soireeKit/swatches';
import { Divider, Head } from './Ornaments';
import { getText } from './texts';
import { flightOf } from './flight';
import Gate from './Gate';
import { useRevisit, afterOpening, isGuestPage, OpeningPreview } from '../soireeKit/opening';
import cloudAUrl from './assets/cloud-a.webp';
import cloudBUrl from './assets/cloud-b.webp';
import ringsUrl from './assets/stamp-rings.webp';
import planeUrl from './assets/stamp-plane.webp';
import heartUrl from './assets/stamp-heart.webp';

const DEFAULT_TEXT = "C'est avec une immense joie que nous vous convions à partager ce moment unique. Votre présence sera notre plus beau cadeau.";

function Hero({ invitation, entered, preview, onReplay }) {
  const tx = (k) => getText(invitation, k);
  const { title, namesLine, venueName, guest } = invitation;
  const { cover, photos } = mediaOf(invitation);
  const photo = cover || photos[0] || null;
  const flight = flightOf(invitation);
  const { names, ini } = flight;
  const longest = Math.max(names.first.length, names.second ? names.second.length : 0, 5);
  return (
    <header className={`em-hero${entered ? ' is-in' : ''}${preview ? ' em-hero--preview' : ''}`} id="top" aria-label={namesLine ? `Invitation de ${namesLine}` : 'Invitation'}>
      {preview && <button type="button" className="em-replay" onClick={onReplay}>↻ Revoir l'ouverture</button>}
      <img className="em-hero__cloud em-hero__cloud--a" src={cloudAUrl} alt="" aria-hidden="true" decoding="async" />
      <img className="em-hero__cloud em-hero__cloud--b" src={cloudBUrl} alt="" aria-hidden="true" decoding="async" />
      <div className="em-hero__title">
        {guest?.name && <p className="em-hero__guest em-rise" style={{ '--i': 0 }}>Cher(e) {guest.name}</p>}
        <h1 className="em-names" style={{ '--len': longest }}>
          <span className="em-rise" style={{ '--i': 1 }}>{names.first || title}</span>
          {names.second && (
            <>
              <span className="em-sr"> et </span>
              <span className="em-amp em-rise" style={{ '--i': 2 }} aria-hidden="true">&amp;</span>
              <span className="em-rise" style={{ '--i': 3 }}>{names.second}</span>
            </>
          )}
        </h1>
        <p className="em-eyebrow em-rise" style={{ '--i': 4 }}>{tx('heroEyebrow')}</p>
      </div>
      {/* Le portrait dans un hublot */}
      <div className="em-porthole em-rise" style={{ '--i': 5 }}>
        <div className="em-porthole__view">
          {photo ? <Pic m={photo} eager sizes="(min-width: 700px) 360px, 62vw" alt={namesLine || ''} focal="50% 24%" /> : <span className="em-mono" aria-hidden="true">{ini.f}{ini.s && <i>&amp;</i>}{ini.s}</span>}
        </div>
      </div>
      <div className="em-hero__foot">
        {flight.long && <p className="em-herodate em-rise" style={{ '--i': 6 }}>{flight.long}</p>}
        {(flight.time || venueName) && <p className="em-herovenue em-rise" style={{ '--i': 7 }}>{[flight.time, venueName].filter(Boolean).join(' · ')}</p>}
        <a className="em-scroll em-rise" style={{ '--i': 8 }} href="#invitation"><span>{tx('openLabel')}</span><i aria-hidden="true" /></a>
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
    <section className="em-intro em-light" id="invitation" aria-label="Invitation">
      <Reveal className="em-letter">
        <img className="em-stamp em-stamp--a" src={planeUrl} alt="" aria-hidden="true" loading="lazy" />
        <img className="em-stamp em-stamp--b" src={ringsUrl} alt="" aria-hidden="true" loading="lazy" />
        <p className="em-eyebrow">{tx('introEyebrow')}</p>
        <h2 className="em-h1">{tx('introTitle')}</h2>
        <Divider />
        <p className="em-lede">{invitationText || DEFAULT_TEXT}</p>
        {quote && <blockquote className="em-quote">« {quote} »</blockquote>}
        <p className="em-sign">{tx('introFooter')}</p>
        {namesLine && <p className="em-signnames">{namesLine}</p>}
      </Reveal>
      {table && (
        <Reveal className="em-luggage" delay={120}>
          <img src={heartUrl} alt="" aria-hidden="true" loading="lazy" />
          <p><span>{seatBefore.trim()}</span><b>{table}</b>{seatAfter.trim() && <span>{seatAfter.trim()}</span>}</p>
        </Reveal>
      )}
    </section>
  );
}

function Details({ invitation }) {
  const tx = (k) => getText(invitation, k);
  const { eventDate, eventTime, venueName, address } = invitation;
  const flight = flightOf(invitation);
  const q = buildMapsQuery(invitation);
  if (!flight.long && !eventTime && !venueName && !address) return null;
  const route = q ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}` : null;
  return (
    <section className="em-details em-dark" aria-label="Détails">
      <Reveal><Head eyebrow={tx('detailsEyebrow')} title={tx('detailsTitle')} /></Reveal>
      <Reveal delay={80}>
        <div className="em-sheet">
          <p className="em-sheet__top"><span>Vol</span><b>{flight.code}</b></p>
          <dl>
            {flight.long && (
              <div>
                <dt>{tx('labelDate')}</dt>
                <dd><b>{formatEventDate(eventDate, { day: 'numeric', month: 'long' })}</b><span>{`${upFirst(formatEventDate(eventDate, { weekday: 'long' }))} · ${formatEventDate(eventDate, { year: 'numeric' })}`}</span></dd>
              </div>
            )}
            {eventTime && <div><dt>{tx('labelTime')}</dt><dd><b>{eventTime}</b></dd></div>}
            {(venueName || address) && <div><dt>{tx('labelPlace')}</dt><dd>{venueName && <b>{venueName}</b>}{address && <span>{address}</span>}</dd></div>}
          </dl>
        </div>
      </Reveal>
      {route && <div className="em-center"><a className="em-btn" href={route} target="_blank" rel="noopener noreferrer">{tx('routeLink')}<span className="em-sr"> (nouvel onglet)</span></a></div>}
    </section>
  );
}

function Dress({ invitation }) {
  const code = (invitation.dressCode || '').trim();
  if (!code) return null;
  const tx = (k) => getText(invitation, k);
  const sw = swatchesOf(code);
  return (
    <section className="em-dress em-light" aria-label="Dress code">
      <Reveal>
        <Head eyebrow={tx('dressEyebrow')} title={tx('dressTitle')} />
        {sw.length > 0 && <ul className="em-tags" aria-hidden="true">{sw.map((s, i) => <li key={i} style={{ '--c': s.bg, '--k': i - (sw.length - 1) / 2 }}><i /></li>)}</ul>}
        <p className="em-dress__code">{code}</p>
        <p className="em-dress__t">{tx('dressText')}</p>
      </Reveal>
    </section>
  );
}

// Couverture : l'ouverture du hublot (uniquement sur la vraie page de l'invité ; dans l'aperçu de l'administration elle se rejoue à la
// demande), puis le ciel et le portrait, l'invitation, les informations de vol et le dress code.
export default function Cover({ invitation }) {
  const isPublic = isGuestPage();
  const preview = useContext(OpeningPreview);
  // Obligatoire à chaque visite de l'invité ; dans l'administration, ouvrir le modèle commence aussi par elle (voir soireeKit/opening.js).
  const [gate, setGate] = useState(isPublic ? 'page' : preview === 'visit' ? 'preview' : null);
  useRevisit(isPublic, () => setGate('page')); // et à chaque retour sur l'invitation
  return (
    <>
      <div className="em-cover">
        {gate && <Gate invitation={invitation} mode={gate === 'inline' ? 'inline' : 'page'} preview={gate === 'preview'} onDone={() => { setGate(null); if (gate === 'page') afterOpening(); }} />}
        <Hero invitation={invitation} entered={!gate} preview={!isPublic && preview !== 'thumbnail'} onReplay={() => setGate(preview === 'visit' ? 'preview' : 'inline')} />
      </div>
      <Intro invitation={invitation} />
      <Details invitation={invitation} />
      <Dress invitation={invitation} />
    </>
  );
}
