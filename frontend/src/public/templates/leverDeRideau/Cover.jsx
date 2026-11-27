import { useContext, useState } from 'react';
import Reveal from '../soireeKit/Reveal';
import Pic from '../soireeKit/Pic';
import { formatEventDate } from '../../../shared/utils/eventDateTime';
import { buildMapsQuery } from '../../utils/mapsUrl';
import { splitNames, initials, mediaOf, upFirst } from '../soireeKit/utils';
import { swatchesOf } from '../soireeKit/swatches';
import { useRevisit, afterOpening, isGuestPage, OpeningPreview } from '../soireeKit/opening';
import { Divider, Head, Prop } from './Ornaments';
import { getText } from './texts';
import Gate from './Gate';
import ovalUrl from './assets/oval.webp';

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
    <header className={`lr-hero${entered ? ' is-in' : ''}${preview ? ' lr-hero--preview' : ''}`} id="top" aria-label={namesLine ? `Invitation de ${namesLine}` : 'Invitation'}>
      {preview && <button type="button" className="lr-replay" onClick={onReplay}>↻ Revoir l'ouverture</button>}
      <span className="lr-hero__pelmet" aria-hidden="true" />
      <span className="lr-hero__spot" aria-hidden="true" />
      <div className="lr-hero__title">
        {guest?.name && <p className="lr-hero__guest lr-in" style={{ '--i': 0 }}>Cher(e) {guest.name}</p>}
        <h1 className="lr-names" style={{ '--len': longest }}>
          <span className="lr-in" style={{ '--i': 1 }}>{names.first || title}</span>
          {names.second && (
            <>
              <span className="lr-sr"> et </span>
              <span className="lr-amp lr-in" style={{ '--i': 2 }} aria-hidden="true">&amp;</span>
              <span className="lr-in" style={{ '--i': 3 }}>{names.second}</span>
            </>
          )}
        </h1>
        <p className="lr-eyebrow lr-in" style={{ '--i': 4 }}>{tx('heroEyebrow')}</p>
      </div>
      {/* Le portrait dans son cadre doré, sous le projecteur */}
      <div className="lr-portrait lr-in" style={{ '--i': 5 }}>
        {photo ? (
          <div className="lr-portrait__photo"><Pic m={photo} eager sizes="(min-width: 700px) 320px, 46vw" alt={namesLine || ''} focal="50% 24%" /></div>
        ) : <div className="lr-portrait__photo lr-portrait__photo--mono" aria-hidden="true"><span>{ini.f}{ini.s && <i>&amp;</i>}{ini.s}</span></div>}
        <img className="lr-portrait__frame" src={ovalUrl} alt="" aria-hidden="true" decoding="async" />
      </div>
      <div className="lr-hero__foot">
        {dateLong && <p className="lr-herodate lr-in" style={{ '--i': 6 }}>{dateLong}</p>}
        {(eventTime || venueName) && <p className="lr-herovenue lr-in" style={{ '--i': 7 }}>{[eventTime, venueName].filter(Boolean).join(' · ')}</p>}
        <a className="lr-scroll lr-in" style={{ '--i': 8 }} href="#invitation"><span>{tx('openLabel')}</span><i aria-hidden="true" /></a>
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
    <section className="lr-intro lr-dark" id="invitation" aria-label="Invitation">
      <Reveal className="lr-programme">
        <Prop name="rings" />
        <p className="lr-eyebrow">{tx('introEyebrow')}</p>
        <h2 className="lr-h1">{tx('introTitle')}</h2>
        <Divider />
        <p className="lr-lede">{invitationText || DEFAULT_TEXT}</p>
        {quote && <blockquote className="lr-quote">« {quote} »</blockquote>}
        <p className="lr-sign">{tx('introFooter')}</p>
        {namesLine && <p className="lr-signnames">{namesLine}</p>}
      </Reveal>
      {table && (
        <Reveal className="lr-seat" delay={120}>
          <Prop name="glasses" />
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
    valid && { key: 'date', prop: 'laurel', label: tx('labelDate'), main: formatEventDate(eventDate, { day: 'numeric', month: 'long' }), sub: `${upFirst(formatEventDate(eventDate, { weekday: 'long' }))} · ${formatEventDate(eventDate, { year: 'numeric' })}` },
    eventTime && { key: 'time', prop: 'lyre', label: tx('labelTime'), main: eventTime },
    (venueName || address) && { key: 'place', prop: 'roses', label: tx('labelPlace'), main: venueName, sub: address },
  ].filter(Boolean);
  return (
    <section className="lr-details lr-dark" aria-label="Détails">
      <Reveal><Head eyebrow={tx('detailsEyebrow')} title={tx('detailsTitle')} /></Reveal>
      <dl className="lr-bills">
        {items.map((it, i) => (
          <Reveal className="lr-bill" key={it.key} delay={i * 110}>
            <Prop name={it.prop} />
            <dt>{it.label}</dt>
            <dd>{it.main && <b>{it.main}</b>}{it.sub && <span>{it.sub}</span>}</dd>
          </Reveal>
        ))}
      </dl>
      {route && <div className="lr-center"><a className="lr-btn" href={route} target="_blank" rel="noopener noreferrer">{tx('routeLink')}<span className="lr-sr"> (nouvel onglet)</span></a></div>}
    </section>
  );
}

function Dress({ invitation }) {
  const code = (invitation.dressCode || '').trim();
  if (!code) return null;
  const tx = (k) => getText(invitation, k);
  const sw = swatchesOf(code);
  // Au moins trois rosettes, en reprenant uniquement les couleurs demandées.
  const rosettes = sw.length === 0 || sw.length >= 3 ? sw : [0, 1, 2].map((i) => sw[i % sw.length]);
  return (
    <section className="lr-dress lr-light" aria-label="Dress code">
      <Reveal>
        <Head eyebrow={tx('dressEyebrow')} title={tx('dressTitle')} prop="fan" />
        {rosettes.length > 0 && <ul className="lr-rosettes" aria-hidden="true">{rosettes.map((s, i) => <li key={i} style={{ '--c': s.bg }} />)}</ul>}
        <p className="lr-dress__code">{code}</p>
        <p className="lr-dress__t">{tx('dressText')}</p>
      </Reveal>
    </section>
  );
}

// Couverture : l'ouverture au théâtre, puis le portrait sous le projecteur, le programme d'invitation, les détails et le dress code.
export default function Cover({ invitation }) {
  const isPublic = isGuestPage();
  const preview = useContext(OpeningPreview);
  // Obligatoire à chaque visite de l'invité ; dans l'administration, ouvrir le modèle commence aussi par elle (voir soireeKit/opening.js).
  const [gate, setGate] = useState(isPublic ? 'page' : preview === 'visit' ? 'preview' : null);
  useRevisit(isPublic, () => setGate('page')); // et à chaque retour sur l'invitation
  return (
    <>
      <div className="lr-cover">
        {gate && <Gate invitation={invitation} mode={gate === 'inline' ? 'inline' : 'page'} preview={gate === 'preview'} onDone={() => { setGate(null); if (gate === 'page') afterOpening(); }} />}
        <Hero invitation={invitation} entered={!gate} preview={!isPublic && preview !== 'thumbnail'} onReplay={() => setGate(preview === 'visit' ? 'preview' : 'inline')} />
      </div>
      <Intro invitation={invitation} />
      <Details invitation={invitation} />
      <Dress invitation={invitation} />
    </>
  );
}
