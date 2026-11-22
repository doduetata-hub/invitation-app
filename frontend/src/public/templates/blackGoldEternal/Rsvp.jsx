import { useState } from 'react';
import Reveal from '../royalEditorial/Reveal';
import RsvpSection from '../../sections/RsvpSection';
import { formatEventDate } from '../../../shared/utils/eventDateTime';
import { splitNames, isDisabled } from './utils';
import { Alliance, Icon, Rule } from './icons';

function Closing({ invitation, slug }) {
  const { namesLine, eventDate, contactPhone, contactWhatsapp } = invitation;
  const n = splitNames(namesLine);
  const [copied, setCopied] = useState(false);
  const contactOn = !isDisabled(invitation, 'contact') && (contactPhone || contactWhatsapp);
  const url = slug && typeof window !== 'undefined' ? `${window.location.origin}/i/${encodeURIComponent(slug)}` : null;
  const text = `${namesLine ? `Invitation de ${namesLine}` : 'Invitation'}${url ? ` — ${url}` : ''}`;
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const date = eventDate ? formatEventDate(eventDate, { day: 'numeric', month: 'long', year: 'numeric' }) : null;

  const share = async () => {
    try { await navigator.share({ title: namesLine || 'Invitation', text: namesLine ? `Invitation de ${namesLine}` : 'Invitation', url }); } catch { /* annulé par l'utilisateur */ }
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch { /* presse-papiers indisponible */ }
  };

  return (
    <section className="bge-closing" id="closing" aria-label="Remerciements">
      <Reveal className="bge-closing__in">
        <p className="bge-thanks">Merci de partager avec nous ce jour béni. Votre présence et vos prières rendront ce moment encore plus précieux.</p>
        <Rule className="bge-closing__rule"><Alliance /></Rule>
        <p className="bge-closing__names">{n.second ? (<>{n.first} <span aria-hidden="true">&amp;</span><span className="bge-sr"> et </span> {n.second}</>) : namesLine}</p>
        {date && <p className="bge-label bge-closing__date">{date}</p>}

        {contactOn && (
          <div className="bge-btnrow">
            {contactWhatsapp && (
              <a className="bge-btn" href={`https://wa.me/${contactWhatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
                <Icon name="whatsapp" className="bge-icon bge-icon--sm" />Écrire aux organisateurs<span className="bge-sr"> (WhatsApp, nouvel onglet)</span>
              </a>
            )}
            {contactPhone && (
              <a className="bge-btn" href={`tel:${contactPhone}`}><Icon name="phone" className="bge-icon bge-icon--sm" />Appeler</a>
            )}
          </div>
        )}

        {url && (
          <div className="bge-share">
            <span className="bge-label">Partager l'invitation</span>
            <div className="bge-share__row">
              <a className="bge-round" href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer" aria-label="Partager sur WhatsApp">
                <Icon name="whatsapp" className="bge-icon" />
              </a>
              {canShare && (
                <button type="button" className="bge-round" onClick={share} aria-label="Partager via une autre application">
                  <Icon name="share" className="bge-icon" />
                </button>
              )}
              <button type="button" className="bge-round" onClick={copy} aria-label={copied ? 'Lien copié' : 'Copier le lien'}>
                <Icon name={copied ? 'check' : 'link'} className="bge-icon" />
              </button>
            </div>
            <p className="bge-sr" role="status">{copied ? 'Lien copié dans le presse-papiers' : ''}</p>
          </div>
        )}
      </Reveal>
    </section>
  );
}

// Réponse + livre d'or + conclusion. Le formulaire est celui de l'application (RsvpSection : identification de l'invité, présence,
// nombre de personnes, boisson, mot du livre d'or, photo, verrouillage, QR d'entrée) ; seul l'habillage change (bge.css : « bge-rsvp__form »).
export default function Rsvp(props) {
  const { invitation, slug } = props;
  const n = splitNames(props.namesLine);
  const who = n.second ? `${n.first} et ${n.second}` : n.first;
  const closed = Boolean(invitation?.guestbookClosed);
  return (
    <>
      <section className="bge-rsvp" aria-label="Confirmer sa présence">
        <div className="bge-rsvp__grid">
          <Reveal className="bge-rsvp__head">
            <Icon name="check" className="bge-icon bge-icon--lg" />
            <h2 className="bge-h3">Confirmez votre présence</h2>
            <p>{who ? `Votre présence est un cadeau précieux pour ${who}.` : 'Votre présence est un cadeau précieux pour nous.'}</p>
          </Reveal>
          <Reveal className="bge-rsvp__form" delay={80}>
            <RsvpSection {...props} />
          </Reveal>
          <Reveal className="bge-gb" delay={120}>
            <span id="guestbook" className="bge-anchor" />
            <Icon name="book" className="bge-icon bge-icon--lg" />
            <h2 className="bge-h3">Livre d'or</h2>
            {closed ? (
              <p>Le livre d'or est clos. Merci à tous ceux qui ont laissé un mot.</p>
            ) : (
              <>
                <p>Laissez un mot aux mariés pour leur témoigner votre amour et vos vœux de bonheur. Il s'écrit dans le formulaire de réponse ci-dessus, avec une photo si vous le souhaitez.</p>
                <a className="bge-btn" href="#rsvp">Laisser un message<Icon name="arrow" className="bge-icon bge-icon--sm" /></a>
              </>
            )}
          </Reveal>
        </div>
      </section>
      <Closing invitation={invitation} slug={slug} />
    </>
  );
}
