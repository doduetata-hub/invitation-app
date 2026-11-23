import { useState } from 'react';
import Reveal from './Reveal';
import RsvpSection from '../../sections/RsvpSection';
import { formatEventDate } from '../../../shared/utils/eventDateTime';
import { splitNames, isDisabled } from './utils';
import { Icon, Flourish } from './icons';

// Dress code : titre en deux temps (DRESS en capitales, « Code » en écriture) et la tenue saisie dans l'invitation.
function DressCode({ dressCode }) {
  const text = (dressCode || '').trim();
  if (!text) return null;
  return (
    <section className="sk-dress" aria-label="Dress code">
      <Reveal>
        <h2 className="sk-dress__t"><span>DRESS</span><em>Code</em></h2>
        <p className="sk-dress__txt">{text}</p>
      </Reveal>
    </section>
  );
}

// Table de l'invité : uniquement quand l'invité est identifié (lien personnalisé) ET qu'une table lui est attribuée.
function Table({ guest }) {
  const table = guest?.tableNumber;
  if (!table) return null;
  return (
    <section className="sk-table" aria-label="Votre table">
      <Reveal>
        <p className="sk-kicker">Votre table</p>
        <p className="sk-table__n">{table}</p>
        <Icon name="plate" className="sk-icon sk-icon--xl" />
      </Reveal>
    </section>
  );
}

function Closing({ invitation, slug }) {
  const { namesLine, eventDate, contactPhone, contactWhatsapp } = invitation;
  const n = splitNames(namesLine);
  const [copied, setCopied] = useState(false);
  const contactOn = !isDisabled(invitation, 'contact') && (contactPhone || contactWhatsapp);
  const url = slug && typeof window !== 'undefined' ? `${window.location.origin}/i/${encodeURIComponent(slug)}` : null;
  const text = `${namesLine ? `Invitation de ${namesLine}` : 'Invitation'}${url ? ` — ${url}` : ''}`;
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const date = eventDate ? formatEventDate(eventDate, { day: 'numeric', month: 'long', year: 'numeric' }) : null;
  const share = async () => { try { await navigator.share({ title: namesLine || 'Invitation', text: namesLine ? `Invitation de ${namesLine}` : 'Invitation', url }); } catch { /* annulé */ } };
  const copy = async () => { try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch { /* indisponible */ } };
  return (
    <section className="sk-closing" aria-label="Remerciements">
      <Reveal>
        <p className="sk-thanks">Merci de partager avec nous ce moment unique.</p>
        <Flourish />
        <p className="sk-closing__names">{n.second ? <>{n.first} <em aria-hidden="true">&amp;</em><span className="sk-sr"> et </span> {n.second}</> : namesLine}</p>
        {date && <p className="sk-kicker">{date}</p>}
        {contactOn && (
          <div className="sk-btnrow">
            {contactWhatsapp && <a className="sk-btn" href={`https://wa.me/${contactWhatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"><Icon name="whatsapp" className="sk-icon sk-icon--sm" />Écrire aux organisateurs<span className="sk-sr"> (WhatsApp, nouvel onglet)</span></a>}
            {contactPhone && <a className="sk-btn sk-btn--ghost" href={`tel:${contactPhone}`}><Icon name="phone" className="sk-icon sk-icon--sm" />Appeler</a>}
          </div>
        )}
        {url && (
          <div className="sk-share">
            <span className="sk-kicker">Partager l'invitation</span>
            <div className="sk-share__row">
              <a className="sk-round" href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer" aria-label="Partager sur WhatsApp"><Icon name="whatsapp" /></a>
              {canShare && <button type="button" className="sk-round" onClick={share} aria-label="Partager via une autre application"><Icon name="share" /></button>}
              <button type="button" className="sk-round" onClick={copy} aria-label={copied ? 'Lien copié' : 'Copier le lien'}><Icon name={copied ? 'check' : 'link'} /></button>
            </div>
            <p className="sk-sr" role="status">{copied ? 'Lien copié dans le presse-papiers' : ''}</p>
          </div>
        )}
      </Reveal>
    </section>
  );
}

// Fin de page : dress code, table, RÉPONSE (le formulaire de l'application, habillé ici) puis conclusion.
// Le formulaire gère à lui seul l'identification de l'invité, la présence, le nombre de personnes, la boisson, le mot du livre d'or,
// la photo facultative et le verrouillage (RsvpSection).
export default function Finale(props) {
  const { invitation, slug } = props;
  const n = splitNames(props.namesLine);
  const who = n.second ? `${n.first} et ${n.second}` : n.first;
  return (
    <>
      <DressCode dressCode={invitation.dressCode} />
      <Table guest={invitation.guest} />
      <section className="sk-rsvp" aria-label="Confirmer sa présence">
        <Reveal>
          <h2 className="sk-script sk-h2">Votre réponse</h2>
          <p className="sk-rsvp__sub">{who ? `${who} souhaitent connaître votre présence.` : 'Merci de nous faire part de votre présence.'}</p>
        </Reveal>
        <Reveal className="sk-rsvp__form" delay={80}><RsvpSection {...props} /></Reveal>
      </section>
      <Closing invitation={invitation} slug={slug} />
    </>
  );
}
