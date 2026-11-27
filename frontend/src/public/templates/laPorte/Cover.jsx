import { useContext, useState } from 'react';
import Reveal from '../soireeKit/Reveal';
import Pic from '../soireeKit/Pic';
import { formatEventDate } from '../../../shared/utils/eventDateTime';
import { buildMapsQuery } from '../../utils/mapsUrl';
import { splitNames, initials, mediaOf } from '../soireeKit/utils';
import { Divider, Head } from './Ornaments';
import { getText } from './texts';
import Gate from './Gate';
import { useRevisit, afterOpening, isGuestPage, OpeningPreview } from '../soireeKit/opening';

const DEFAULT_TEXT = "C'est avec une immense joie que nous vous convions à partager ce moment unique. Votre présence sera notre plus beau cadeau.";

// Mots de couleur reconnus dans le dress code : une pastille est dessinée pour chacun.
const SWATCHES = [
  [/^noir/i, '#0c0c0e'], [/^blanc/i, '#fbf8f1'], [/^(ivoire|cr[eè]me)/i, '#efe4cc'], [/^(dor[eé]|or\b)/i, 'linear-gradient(135deg,#f3dfa6,#b8914a)'],
  [/^argent/i, 'linear-gradient(135deg,#f1f1f1,#9aa0a8)'], [/^bordeaux/i, '#5b1424'], [/^(rouge)/i, '#a3182b'], [/^(bleu nuit|marine)/i, '#0f1b3d'],
  [/^bleu/i, '#1f4a8c'], [/^(vert|[eé]meraude)/i, '#1d5a45'], [/^(rose|poudr)/i, '#e8b4bc'], [/^beige/i, '#d8c3a0'], [/^(gris|anthracite)/i, '#5d6068'],
  [/^(violet|mauve)/i, '#5d3a7e'], [/^nude/i, '#d9b9a2'], [/^(marron|chocolat|caf[eé])/i, '#4a2f20'], [/^(orange|terracotta)/i, '#c4622d'], [/^(jaune|moutarde)/i, '#d9a82b'],
];

function swatchesOf(text) {
  const words = (text || '').split(/[\s,;&/+.()'’-]+/).filter(Boolean);
  const out = [];
  words.forEach((w) => {
    const hit = SWATCHES.find(([re]) => re.test(w));
    if (hit) out.push({ bg: hit[1], name: w });
  });
  return out.slice(0, 5);
}

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
    <header className={`lp-hero${entered ? ' is-in' : ''}`} id="top" aria-label={namesLine ? `Invitation de ${namesLine}` : 'Invitation'}>
      <div className="lp-hero__sky" aria-hidden="true" />
      {preview && <button type="button" className="lp-replay" onClick={onReplay}>↻ Revoir l'ouverture de la porte</button>}
      {guest?.name && <p className="lp-hero__guest lp-rise" style={{ '--i': 0 }}>Cher(e) {guest.name}</p>}
      <p className="lp-eyebrow lp-rise" style={{ '--i': 1 }}>{tx('heroEyebrow')}</p>
      {/* Le portrait vu par la porte entrouverte : deux battants de bois de part et d'autre, la lumière de l'intérieur sur la photo. */}
      <div className="lp-view lp-rise" style={{ '--i': 2 }}>
        <span className="lp-view__leaf lp-view__leaf--l" aria-hidden="true" />
        <div className="lp-view__photo">
          {photo ? <Pic m={photo} eager sizes="(min-width: 700px) 420px, 76vw" alt={namesLine || ''} focal="50% 24%" /> : <span className="lp-mono" aria-hidden="true">{ini.f}{ini.s && <i>&amp;</i>}{ini.s}</span>}
        </div>
        <span className="lp-view__leaf lp-view__leaf--r" aria-hidden="true" />
      </div>
      <h1 className="lp-names" style={{ '--len': longest }}>
        <span className="lp-n1 lp-rise" style={{ '--i': 3 }}>{names.first || title}</span>
        {names.second && (
          <>
            <span className="lp-sr"> et </span>
            <span className="lp-amp lp-rise" style={{ '--i': 4 }} aria-hidden="true">&amp;</span>
            <span className="lp-n2 lp-rise" style={{ '--i': 5 }}>{names.second}</span>
          </>
        )}
      </h1>
      <Divider className="lp-rise" />
      <p className="lp-herodate lp-rise" style={{ '--i': 6 }}>{[dateLong, eventTime].filter(Boolean).join('  ·  ')}</p>
      {venueName && <p className="lp-herovenue lp-rise" style={{ '--i': 7 }}>{venueName}</p>}
      <a className="lp-scroll lp-rise" style={{ '--i': 8 }} href="#invitation"><span>{tx('openLabel')}</span><i aria-hidden="true" /></a>
    </header>
  );
}

function Intro({ invitation }) {
  const tx = (k) => getText(invitation, k);
  const { namesLine, invitationText, personalMessage, guest } = invitation;
  const names = splitNames(namesLine);
  const ini = initials(names);
  const quote = (personalMessage || '').trim().replace(/^[«"“]\s*|\s*[»"”]$/g, '');
  const table = guest?.tableNumber ? String(guest.tableNumber) : '';
  return (
    <section className="lp-intro" id="invitation" aria-label="Invitation">
      <Reveal className="lp-intro__card">
        <span className="lp-seal-mini" aria-hidden="true">{ini.f}{ini.s ? ' & ' : ''}{ini.s}</span>
        <p className="lp-eyebrow lp-eyebrow--ink">{tx('introEyebrow')}</p>
        <h2 className="lp-h1">{tx('introTitle')}</h2>
        <Divider className="lp-div--ink" />
        <p className="lp-lede">{invitationText || DEFAULT_TEXT}</p>
        {quote && <blockquote className="lp-quote">« {quote} »</blockquote>}
        <p className="lp-sign">{tx('introFooter')}</p>
        {namesLine && <p className="lp-signnames">{namesLine}</p>}
      </Reveal>
      {table && (
        <Reveal className="lp-seat" delay={120}>
          <span className="lp-seat__tent" aria-hidden="true" />
          <p className="lp-seat__t">{tx('seatText').replace('{table}', '')}<b>{table}</b></p>
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
  return (
    <section className="lp-details" aria-label="Détails">
      <Reveal><Head eyebrow={tx('detailsEyebrow')} title={tx('detailsTitle')} /></Reveal>
      <dl className="lp-facts">
        {valid && (
          <Reveal className="lp-fact" delay={0}>
            <dt>{tx('labelDate')}</dt>
            <dd><b>{formatEventDate(eventDate, { day: 'numeric', month: 'long' })}</b><span>{formatEventDate(eventDate, { weekday: 'long', year: 'numeric' })}</span></dd>
          </Reveal>
        )}
        {eventTime && (
          <Reveal className="lp-fact" delay={90}>
            <dt>{tx('labelTime')}</dt>
            <dd><b>{eventTime}</b></dd>
          </Reveal>
        )}
        {(venueName || address) && (
          <Reveal className="lp-fact" delay={180}>
            <dt>{tx('labelPlace')}</dt>
            <dd>{venueName && <b>{venueName}</b>}{address && <span>{address}</span>}</dd>
          </Reveal>
        )}
      </dl>
      {route && <div className="lp-center"><a className="lp-btn" href={route} target="_blank" rel="noopener noreferrer">{tx('routeLink')}<span className="lp-sr"> (nouvel onglet)</span></a></div>}
    </section>
  );
}

function Dress({ invitation }) {
  const code = (invitation.dressCode || '').trim();
  if (!code) return null;
  const tx = (k) => getText(invitation, k);
  const sw = swatchesOf(code);
  return (
    <section className="lp-dress" aria-label="Dress code">
      <Reveal className="lp-dress__card">
        <p className="lp-eyebrow">{tx('dressEyebrow')}</p>
        <h2 className="lp-h2">{tx('dressTitle')}</h2>
        {sw.length > 0 && <ul className="lp-sw" aria-hidden="true">{sw.map((s, i) => <li key={i} style={{ background: s.bg, '--k': i - (sw.length - 1) / 2 }} />)}</ul>}
        <p className="lp-dress__code">{code}</p>
        <p className="lp-dress__t">{tx('dressText')}</p>
      </Reveal>
    </section>
  );
}

// Couverture : l'ouverture de la porte (uniquement sur la vraie page de l'invité ; dans l'aperçu de l'administration elle se rejoue à la demande),
// puis le portrait sous une arche, l'invitation, les détails et le dress code.
export default function Cover({ invitation }) {
  const isPublic = isGuestPage();
  const preview = useContext(OpeningPreview);
  // Obligatoire à chaque visite de l'invité ; dans l'administration, ouvrir le modèle commence aussi par elle (voir soireeKit/opening.js).
  const [gate, setGate] = useState(isPublic ? 'page' : preview === 'visit' ? 'preview' : null);
  useRevisit(isPublic, () => setGate('page')); // et à chaque retour sur l'invitation
  return (
    <>
      <div className="lp-cover">
        {gate && <Gate invitation={invitation} mode={gate === 'inline' ? 'inline' : 'page'} preview={gate === 'preview'} onDone={() => { setGate(null); if (gate === 'page') afterOpening(); }} />}
        <Hero invitation={invitation} entered={!gate} preview={!isPublic && preview !== 'thumbnail'} onReplay={() => setGate(preview === 'visit' ? 'preview' : 'inline')} />
      </div>
      <Intro invitation={invitation} />
      <Details invitation={invitation} />
      <Dress invitation={invitation} />
    </>
  );
}
