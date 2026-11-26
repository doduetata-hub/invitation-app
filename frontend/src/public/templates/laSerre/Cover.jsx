import { useState } from 'react';
import Reveal from '../soireeKit/Reveal';
import Pic from '../soireeKit/Pic';
import { formatEventDate } from '../../../shared/utils/eventDateTime';
import { buildMapsQuery } from '../../utils/mapsUrl';
import { splitNames, initials, mediaOf, upFirst } from '../soireeKit/utils';
import { Divider, Head } from './Ornaments';
import { getText } from './texts';
import Gate from './Gate';
import archUrl from './assets/arch.webp';
import eucalyptusUrl from './assets/eucalyptus.webp';
import oliveUrl from './assets/olive.webp';

const DEFAULT_TEXT = "C'est avec une immense joie que nous vous convions à partager ce moment unique. Votre présence sera notre plus beau cadeau.";

// Couleurs reconnues dans le dress code : un pétale est dessiné pour chacune. Les expressions composées (« vert sauge », « rose
// poudré ») passent en premier pour ne donner qu'un seul pétale.
const SWATCHES = [
  ['vert sauge|sauge', '#a9b89c'], ['rose poudr[eé]|poudr[eé]|pivoine', '#e5b8ae'], ['bleu nuit|bleu marine|marine', '#0f1b3d'],
  ['vert [eé]meraude|[eé]meraude', '#1f5a44'], ['noir', '#151515'], ['blanc(?:he)?', '#fdfcf8'], ['ivoire|cr[eè]me', '#efe4cc'],
  ['dor[eé]|or', 'linear-gradient(135deg,#f3dfa6,#a8854a)'], ['argent[eé]?', 'linear-gradient(135deg,#f1f1f1,#9aa0a8)'], ['bordeaux', '#5b1424'],
  ['rouge', '#a3182b'], ['bleu', '#4a79b0'], ['vert', '#1f5a44'], ['rose', '#e5a3b0'], ['beige', '#d8c3a0'], ['gris|anthracite', '#6b6f72'],
  ['violet|mauve|lilas|lavande', '#9b84b8'], ['nude', '#d9b9a2'], ['marron|chocolat|caf[eé]', '#5a3a28'], ['orange|terracotta|p[eê]che', '#d08358'],
  ['jaune|moutarde|champagne', '#dcc38a'],
];

function swatchesOf(text) {
  let rest = (text || '').toLowerCase();
  const found = [];
  SWATCHES.forEach(([words, bg]) => {
    const re = new RegExp(`(^|[^a-zà-ÿ])((?:${words})(?:e?s|e)?)(?=$|[^a-zà-ÿ])`);
    const hit = re.exec(rest);
    if (!hit) return;
    const at = hit.index + hit[1].length;
    found.push({ at, bg });
    rest = rest.slice(0, at) + ' '.repeat(hit[2].length) + rest.slice(at + hit[2].length);
  });
  return found.sort((a, b) => a.at - b.at).slice(0, 5);
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
    <header className={`ls-hero${entered ? ' is-in' : ''}${preview ? ' ls-hero--preview' : ''}`} id="top" aria-label={namesLine ? `Invitation de ${namesLine}` : 'Invitation'}>
      {preview && <button type="button" className="ls-replay" onClick={onReplay}>↻ Revoir l'ouverture</button>}
      <div className="ls-hero__top">
        {guest?.name && <p className="ls-hero__guest ls-rise" style={{ '--i': 0 }}>Cher(e) {guest.name}</p>}
        <p className="ls-eyebrow ls-rise" style={{ '--i': 1 }}>{tx('heroEyebrow')}</p>
      </div>
      {/* Le portrait dans une fenêtre de la verrière, entourée de rosiers grimpants */}
      <div className="ls-arch ls-rise" style={{ '--i': 2 }}>
        <div className="ls-arch__photo">
          {photo ? <Pic m={photo} eager sizes="(min-width: 700px) 380px, 66vw" alt={namesLine || ''} focal="50% 24%" /> : <span className="ls-mono" aria-hidden="true">{ini.f}{ini.s && <i>&amp;</i>}{ini.s}</span>}
        </div>
        <img className="ls-arch__frame" src={archUrl} alt="" aria-hidden="true" decoding="async" />
      </div>
      <div className="ls-hero__text">
        <h1 className="ls-names" style={{ '--len': longest }}>
          <span className="ls-rise" style={{ '--i': 3 }}>{names.first || title}</span>
          {names.second && (
            <>
              <span className="ls-sr"> et </span>
              <span className="ls-amp ls-rise" style={{ '--i': 4 }} aria-hidden="true">&amp;</span>
              <span className="ls-rise" style={{ '--i': 5 }}>{names.second}</span>
            </>
          )}
        </h1>
        <Divider className="ls-rise" />
        {(dateLong || eventTime) && <p className="ls-herodate ls-rise" style={{ '--i': 6 }}>{dateLong || eventTime}</p>}
        {(venueName || (dateLong && eventTime)) && <p className="ls-herovenue ls-rise" style={{ '--i': 7 }}>{[dateLong ? eventTime : null, venueName].filter(Boolean).join(' · ')}</p>}
        <a className="ls-scroll ls-rise" style={{ '--i': 8 }} href="#invitation"><span>{tx('openLabel')}</span><i aria-hidden="true" /></a>
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
    <section className="ls-intro ls-light" id="invitation" aria-label="Invitation">
      <Reveal className="ls-sheet">
        <img className="ls-sprig ls-sprig--a" src={eucalyptusUrl} alt="" aria-hidden="true" loading="lazy" />
        <img className="ls-sprig ls-sprig--b" src={oliveUrl} alt="" aria-hidden="true" loading="lazy" />
        <p className="ls-eyebrow">{tx('introEyebrow')}</p>
        <h2 className="ls-h1">{tx('introTitle')}</h2>
        <Divider />
        <p className="ls-lede">{invitationText || DEFAULT_TEXT}</p>
        {quote && <blockquote className="ls-quote">« {quote} »</blockquote>}
        <p className="ls-sign">{tx('introFooter')}</p>
        {namesLine && <p className="ls-signnames">{namesLine}</p>}
      </Reveal>
      {table && (
        <Reveal className="ls-stake" delay={120}>
          <p className="ls-stake__tag"><span>{seatBefore.trim()}</span><b>{table}</b>{seatAfter.trim() && <span>{seatAfter.trim()}</span>}</p>
          <i aria-hidden="true" />
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
    <section className="ls-details ls-dark" aria-label="Détails">
      <Reveal><Head eyebrow={tx('detailsEyebrow')} title={tx('detailsTitle')} /></Reveal>
      <dl className="ls-labels">
        {valid && (
          <Reveal className="ls-label" delay={0}>
            <dt>{tx('labelDate')}</dt>
            <dd><b>{formatEventDate(eventDate, { day: 'numeric', month: 'long' })}</b><span>{`${upFirst(formatEventDate(eventDate, { weekday: 'long' }))} · ${formatEventDate(eventDate, { year: 'numeric' })}`}</span></dd>
          </Reveal>
        )}
        {eventTime && (
          <Reveal className="ls-label" delay={90}>
            <dt>{tx('labelTime')}</dt>
            <dd><b>{eventTime}</b></dd>
          </Reveal>
        )}
        {(venueName || address) && (
          <Reveal className="ls-label" delay={180}>
            <dt>{tx('labelPlace')}</dt>
            <dd>{venueName && <b>{venueName}</b>}{address && <span>{address}</span>}</dd>
          </Reveal>
        )}
      </dl>
      {route && <div className="ls-center"><a className="ls-btn" href={route} target="_blank" rel="noopener noreferrer">{tx('routeLink')}<span className="ls-sr"> (nouvel onglet)</span></a></div>}
    </section>
  );
}

function Dress({ invitation }) {
  const code = (invitation.dressCode || '').trim();
  if (!code) return null;
  const tx = (k) => getText(invitation, k);
  const sw = swatchesOf(code);
  return (
    <section className="ls-dress ls-light" aria-label="Dress code">
      <Reveal>
        <Head eyebrow={tx('dressEyebrow')} title={tx('dressTitle')} />
        {sw.length > 0 && <ul className="ls-petals" aria-hidden="true">{sw.map((s, i) => <li key={i} style={{ background: s.bg, '--k': i - (sw.length - 1) / 2 }} />)}</ul>}
        <p className="ls-dress__code">{code}</p>
        <p className="ls-dress__t">{tx('dressText')}</p>
      </Reveal>
    </section>
  );
}

// Couverture : l'ouverture dans la buée (uniquement sur la vraie page de l'invité ; dans l'aperçu de l'administration elle se rejoue à la
// demande), puis le portrait dans l'arche, l'invitation, les détails et le dress code.
export default function Cover({ invitation }) {
  const isPublic = typeof window !== 'undefined' && /^\/i\//.test(window.location.pathname);
  const deepLink = typeof window !== 'undefined' && window.location.hash.length > 1;
  const [gate, setGate] = useState(isPublic && !deepLink ? 'page' : null);
  return (
    <>
      <div className="ls-cover">
        {gate && <Gate invitation={invitation} mode={gate} replay={gate === 'inline'} onDone={() => setGate(null)} />}
        <Hero invitation={invitation} entered={gate !== 'page'} preview={!isPublic} onReplay={() => setGate('inline')} />
      </div>
      <Intro invitation={invitation} />
      <Details invitation={invitation} />
      <Dress invitation={invitation} />
    </>
  );
}
