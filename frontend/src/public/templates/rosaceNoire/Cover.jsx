import Reveal from '../soireeKit/Reveal';
import Pic from '../soireeKit/Pic';
import { formatEventDate } from '../../../shared/utils/eventDateTime';
import { buildMapsUrl } from '../../utils/mapsUrl';
import { splitNames, initials, mediaOf, pick, upFirst } from '../soireeKit/utils';
import { RingText, DressRings, TwoLines } from './Ornaments';
import { getText } from './texts';

const DEFAULT_TEXT = "C'est avec une immense joie que nous vous convions à la célébration de notre mariage religieux. Votre présence et vos prières seront notre plus beau cadeau pour bénir cette union devant Dieu.";
// Matthieu 19:6, version Louis Segond 1910 (domaine public). Remplacé par le message personnel de l'invitation s'il existe.
const VERSE = { text: "Que l'homme ne sépare donc pas ce que Dieu a joint.", ref: 'Matthieu 19 : 6' };

const COLOR_WORDS = /^(noir|blanc|ivoire|cr[eè]me|dor[eé]|or|argent|bordeaux|rouge|bleu|vert|rose|beige|marron|gris|violet|nude)/i;
const clean = (w) => w.replace(/^(tenue|dress code|code|couleur|ton|en)\s+/i, '').trim();

/** « Noir & noir », « Noir et noir », « Noir / Noir » → ['NOIR', 'NOIR'] ; texte long ou libre → null (affiché sous forme de ligne). */
function dressWords(text) {
  const t = (text || '').trim();
  if (!t) return { words: null, text: '' };
  const parts = t.split(/\s*(?:\/|&|\+|,)\s*|\s+et\s+/i).map(clean).filter(Boolean);
  const ok = parts.length > 0 && parts.length <= 2 && parts.every((w) => w.length <= 9 && COLOR_WORDS.test(w));
  return { words: ok ? parts.map((w) => w.toLocaleUpperCase('fr-FR')) : null, text: t };
}

function Hero({ invitation }) {
  const tx = (k) => getText(invitation, k);
  const { title, namesLine, eventDate } = invitation;
  const { cover } = mediaOf(invitation);
  const names = splitNames(namesLine);
  const ini = initials(names);
  const valid = eventDate && !Number.isNaN(new Date(eventDate).getTime());
  const longest = Math.max(names.first.length, names.second ? names.second.length + 2 : 0, 4);
  const label = title || 'Mariage religieux';
  const dateLong = valid ? formatEventDate(eventDate, { day: 'numeric', month: 'long', year: 'numeric' }) : null;
  const ring = [namesLine && namesLine.toLocaleUpperCase('fr-FR'), dateLong && dateLong.toLocaleUpperCase('fr-FR'), label.toLocaleUpperCase('fr-FR')];
  return (
    <header className="nv-hero" id="top" aria-label={namesLine ? `Invitation de ${namesLine}` : 'Invitation'}>
      <div className="nv-hero__glow" aria-hidden="true" />
      <div className="nv-hero__stage">
        {/* Ouverture : l'onde de choc (trois anneaux), l'iris du portrait et l'éclair de lumière sont purement décoratifs. */}
        <span className="nv-boom" aria-hidden="true"><i style={{ '--k': 0 }} /><i style={{ '--k': 1 }} /><i style={{ '--k': 2 }} /></span>
        <RingText parts={ring} />
        <div className="nv-hero__portrait">
          {cover ? <Pic m={cover} eager sizes="(min-width: 700px) 420px, 80vw" alt={namesLine || ''} focal="50% 22%" /> : <span className="nv-mono" aria-hidden="true">{ini.f}{ini.s && <i>&amp;</i>}{ini.s}</span>}
        </div>
        <span className="nv-hero__flash" aria-hidden="true" />
      </div>
      <p className="nv-eyebrow nv-rise" style={{ '--i': 1 }}>{tx('heroEyebrow')}</p>
      <h1 className="nv-names" style={{ '--len': longest }}>
        <span className="nv-n1"><span className="nv-line" style={{ '--i': 0 }}>{names.first || title}</span></span>
        {names.second && (
          <>
            <span className="nv-sr"> et </span>
            <span className="nv-n2"><span className="nv-line" style={{ '--i': 1 }}><i aria-hidden="true">&amp;</i> {names.second}</span></span>
          </>
        )}
      </h1>
      <span className="nv-rule nv-rise" style={{ '--i': 4 }} aria-hidden="true" />
      <p className="nv-herodate nv-rise" style={{ '--i': 4 }}>{[label, dateLong].filter(Boolean).join(' · ')}</p>
      <a className="nv-open nv-rise" style={{ '--i': 5 }} href="#invitation">
        <span className="nv-open__t">{tx('openLabel')}</span>
        <span className="nv-open__line" aria-hidden="true"><i /></span>
      </a>
    </header>
  );
}

function Intro({ invitation }) {
  const tx = (k) => getText(invitation, k);
  const { namesLine, invitationText, guest } = invitation;
  const names = splitNames(namesLine);
  const ini = initials(names);
  return (
    <section className="nv-intro" id="invitation" aria-label="Invitation">
      <Reveal>
        <p className="nv-mono2" aria-hidden="true">{ini.f}{ini.s ? ' & ' : ''}{ini.s}</p>
        {guest?.name && <p className="nv-eyebrow nv-eyebrow--ink">Cher(e) {guest.name}</p>}
        <p className="nv-eyebrow nv-eyebrow--ink">{tx('introEyebrow')}</p>
        <h2 className="nv-h1"><TwoLines a={tx('introTitle1')} b={tx('introTitle2')} /></h2>
        <p className="nv-lede">{invitationText || DEFAULT_TEXT}</p>
        <span className="nv-rule nv-rule--ink" aria-hidden="true" />
        <p className="nv-eyebrow nv-eyebrow--ink">{tx('introFooter')}</p>
      </Reveal>
    </section>
  );
}

function Feature({ invitation }) {
  const { photos } = mediaOf(invitation);
  // Dernière photo de la galerie : la pile de tirages commence par la première, on évite de montrer deux fois la même au début.
  const photo = pick(photos, photos.length - 1);
  if (!photo) return null;
  return (
    <section className="nv-feature" aria-label="Portrait du couple">
      <Pic m={photo} sizes="(min-width: 800px) 1100px, 100vw" focal="50% 26%" alt={invitation.namesLine ? `${invitation.namesLine}` : ''} />
      <div className="nv-feature__cap">
        <p className="nv-eyebrow">{getText(invitation, 'featureEyebrow')}</p>
        {invitation.namesLine && <p className="nv-feature__names">{invitation.namesLine}</p>}
      </div>
    </section>
  );
}

function Verse({ invitation }) {
  const own = (invitation.personalMessage || '').trim();
  return (
    <section className="nv-verse" aria-label="Verset">
      <Reveal>
        <span className="nv-verse__mark" aria-hidden="true">“</span>
        <blockquote className="nv-verse__t">
          {(own ? own.replace(/^[«"“]\s*|\s*[»"”]$/g, '') : VERSE.text).split(/\s+/).map((w, i, all) => (
            <span key={i}><span className="nv-w" style={{ '--w': i }}>{w}</span>{i < all.length - 1 ? ' ' : ''}</span>
          ))}
        </blockquote>
        {!own && <p className="nv-eyebrow">{VERSE.ref}</p>}
      </Reveal>
    </section>
  );
}

function Details({ invitation }) {
  const tx = (k) => getText(invitation, k);
  const { eventDate, eventTime, venueName, address } = invitation;
  const valid = eventDate && !Number.isNaN(new Date(eventDate).getTime());
  const maps = buildMapsUrl(invitation);
  if (!valid && !eventTime && !venueName && !address) return null;
  return (
    <section className="nv-details" aria-label="Les détails">
      <Reveal>
        <p className="nv-eyebrow nv-eyebrow--ink">{tx('detailsEyebrow')}</p>
        <h2 className="nv-h2"><TwoLines a={tx('detailsTitle1')} b={tx('detailsTitle2')} /></h2>
        <dl className="nv-dl">
          {valid && <div><dt>{tx('labelDate')}</dt><dd><strong>{upFirst(formatEventDate(eventDate, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))}</strong></dd></div>}
          {eventTime && <div><dt>{tx('labelTime')}</dt><dd><strong>{eventTime}</strong></dd></div>}
          {(venueName || address) && (
            <div>
              <dt>{tx('labelPlace')}</dt>
              <dd>
                {venueName && <strong>{venueName}</strong>}
                {address && <><br />{address}</>}
                {maps && <><br /><a className="nv-link" href={maps} target="_blank" rel="noopener noreferrer">{tx('routeLink')} ↗<span className="nv-sr"> (nouvel onglet)</span></a></>}
              </dd>
            </div>
          )}
        </dl>
      </Reveal>
    </section>
  );
}

function Dress({ dressCode, invitation }) {
  const tx = (k) => getText(invitation, k);
  const { words, text } = dressWords(dressCode);
  if (!text) return null;
  return (
    <section className="nv-dress" aria-label="Dress code">
      <Reveal>
        <p className="nv-eyebrow">{tx('dressEyebrow')}</p>
        <h2 className="nv-h2 nv-h2--light">{tx('dressTitle')}</h2>
        {words ? <DressRings words={words} /> : <p className="nv-dress__chip">{text}</p>}
        <p className="nv-dress__p">{tx('dressText')}</p>
      </Reveal>
    </section>
  );
}

export default function Cover({ invitation }) {
  return (
    <div>
      <Hero invitation={invitation} />
      <Intro invitation={invitation} />
      <Feature invitation={invitation} />
      <Verse invitation={invitation} />
      <Details invitation={invitation} />
      <Dress dressCode={invitation.dressCode} invitation={invitation} />
    </div>
  );
}
