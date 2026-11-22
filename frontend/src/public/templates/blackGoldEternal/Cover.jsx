import Reveal from '../royalEditorial/Reveal';
import { formatEventDate } from '../../../shared/utils/eventDateTime';
import { splitNames, initials, mediaOf, dressWords, upFirst, pad2, venueLine } from './utils';
import { Cross, Rule, Icon } from './icons';
import Nav from './Nav';
import Pic from './Pic';

const DEFAULT_QUOTE = 'Deux cœurs, une foi, un engagement pour la vie.';

// Couverture : photo des mariés baignée de noir et d'or, noms en grand, citation. Puis les informations essentielles
// (date, heure, lieu) et le dress code mis en scène avec les vraies photographies du couple.
export default function Cover({ invitation }) {
  const { title, namesLine, eventDate, eventTime, venueName, personalMessage, dressCode } = invitation;
  const { cover, gallery } = mediaOf(invitation);
  const names = splitNames(namesLine);
  const ini = initials(names);
  const d = eventDate ? new Date(eventDate) : null;
  const valid = d && !Number.isNaN(d.getTime());
  const photos = gallery.filter((m) => !(m.mimeType || '').startsWith('video/'));
  const dress = dressWords(dressCode);
  const dressPhoto = photos.find((m) => m !== cover) || null;
  const longest = Math.max(names.first.length, names.second ? names.second.length : 0, 3);
  const address = venueLine(invitation);
  const quote = (personalMessage || '').trim().replace(/^«\s*|\s*»$/g, '') || DEFAULT_QUOTE;

  const facts = [
    valid && {
      icon: 'calendar',
      label: 'Date',
      main: upFirst(formatEventDate(eventDate, { weekday: 'long' })),
      sub: `${pad2(d.getUTCDate())} ${formatEventDate(eventDate, { month: 'long' })} ${d.getUTCFullYear()}`,
    },
    eventTime && { icon: 'clock', label: 'Heure', main: eventTime, sub: 'Accueil des invités' },
    (venueName || address) && { icon: 'pin', label: 'Lieu', main: venueName || address, sub: venueName ? address : '' },
  ].filter(Boolean);

  return (
    <div>
      <Nav invitation={invitation} />

      <header className="bge-hero" id="top" aria-label={namesLine ? `Invitation de ${namesLine}` : 'Invitation'}>
        {cover ? (
          <div className="bge-hero__photo">
            <Pic m={cover} eager sizes="(min-width: 900px) 58vw, 100vw" alt={namesLine || ''} focal="52% 22%" />
          </div>
        ) : (
          <div className="bge-hero__photo bge-hero__photo--mono" aria-hidden="true"><span>{ini.f}{ini.s}</span></div>
        )}
        <div className="bge-hero__shade" aria-hidden="true" />
        <div className="bge-hero__text">
          <p className="bge-eyebrow bge-rise" style={{ '--i': 0 }}>{title || 'Notre mariage religieux'}</p>
          <Rule className="bge-rise"><Cross /></Rule>
          <h1 className={`bge-names${longest > 11 ? ' bge-names--long' : ''}`} style={{ '--len': longest }}>
            <span className="bge-name bge-rise" style={{ '--i': 1 }}>
              {names.first || title}
              {names.second && <span className="bge-amp" aria-hidden="true"> &amp;</span>}
            </span>
            {names.second && (
              <>
                <span className="bge-sr"> et </span>
                <span className="bge-name bge-name--b bge-rise" style={{ '--i': 2 }}>{names.second}</span>
              </>
            )}
          </h1>
          <p className="bge-quote bge-rise" style={{ '--i': 3 }}>« {quote} »</p>
          <a className="bge-scroll bge-rise" style={{ '--i': 4 }} href="#facts" aria-label="Découvrir l'invitation"><span /></a>
        </div>
      </header>

      {facts.length > 0 && (
        <section className="bge-facts" id="facts" aria-label="Informations">
          <ul>
            {facts.map((f, i) => (
              <Reveal as="li" key={f.label} delay={i * 80}>
                <Icon name={f.icon} className="bge-icon bge-icon--lg" />
                <span className="bge-label">{f.label}</span>
                <b className="bge-fact__main">{f.main}</b>
                {f.sub && <span className="bge-fact__sub">{f.sub}</span>}
              </Reveal>
            ))}
          </ul>
        </section>
      )}

      {dress.length > 0 && (
        <section className={`bge-dress${dressPhoto ? ' has-photo' : ''}`} aria-label="Dress code">
          <Reveal className="bge-dress__txt">
            <Icon name="tie" className="bge-icon bge-icon--lg" />
            <span className="bge-label">Dress code</span>
            <p className="bge-dress__words" aria-label={dress.join(' / ')}>
              {dress.map((w, i) => (
                <span key={`${w}${i}`}>{w}{i < dress.length - 1 && <i aria-hidden="true"> / </i>}</span>
              ))}
            </p>
            <p className="bge-dress__note">L'élégance en noir, pour un jour d'exception.</p>
          </Reveal>
          {dressPhoto && (
            <Reveal className="bge-dress__photo" delay={100}>
              <figure><Pic m={dressPhoto} sizes="(min-width: 900px) 420px, 80vw" focal="50% 20%" /></figure>
            </Reveal>
          )}
        </section>
      )}
    </div>
  );
}
