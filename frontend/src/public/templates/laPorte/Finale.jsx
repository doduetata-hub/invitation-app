import { useState } from 'react';
import Reveal from '../soireeKit/Reveal';
import RsvpSection from '../../sections/RsvpSection';
import { formatEventDate } from '../../../shared/utils/eventDateTime';
import { splitNames, initials, isDisabled, pad2 } from '../soireeKit/utils';
import { Head, Divider } from './Ornaments';
import { getText } from './texts';

// Billet d'accès : QR code PERSONNEL de l'invité (celui de l'application), son nom, sa table et ses places. N'apparaît que si l'invité
// a ouvert son lien personnalisé (sans lien, l'application ne peut pas émettre de QR code).
function Ticket({ invitation, slug }) {
  const { guest, namesLine, eventDate, eventTime, venueName, title } = invitation;
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  if (!guest?.code || !slug) return null;
  const qrUrl = `/api/public/invitations/${slug}/qrcode?guest=${encodeURIComponent(guest.code)}`;
  const d = eventDate ? new Date(eventDate) : null;
  const valid = d && !Number.isNaN(d.getTime());
  const guestName = guest.name || guest.rsvp?.name || '';
  const download = async () => {
    setBusy(true);
    setMsg('');
    try {
      const res = await fetch(qrUrl);
      if (!res.ok) throw new Error('qr');
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement('a');
      a.href = url;
      a.download = `QR-acces-${(guestName || 'invite').replace(/\s+/g, '-')}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setMsg('Le QR code est momentanément indisponible. Réessayez dans un instant.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="lp-ticketsec" id="billet" aria-label="Votre billet d'accès">
      <Reveal>
        <Head eyebrow={getText(invitation, 'ticketEyebrow')} title={getText(invitation, 'ticketTitle')} sub={getText(invitation, 'ticketText')} />
      </Reveal>
      <Reveal className="lp-ticket" delay={80}>
        <div className="lp-ticket__top"><span>{getText(invitation, 'ticketTop')}</span>{valid && <span>{pad2(d.getUTCDate())} · {pad2(d.getUTCMonth() + 1)} · {d.getUTCFullYear()}</span>}</div>
        {namesLine && <h3 className="lp-ticket__names">{namesLine}</h3>}
        <p className="lp-ticket__meta">{[title, eventTime].filter(Boolean).join(' · ')}{venueName && <><br />{venueName}</>}</p>
        <div className="lp-ticket__body">
          <div className="lp-ticket__qr"><img src={qrUrl} alt="Votre QR code d'accès" width="110" height="110" /></div>
          <div className="lp-ticket__guest">
            <span className="lp-ticket__k">Invité(e)</span>
            {guestName && <strong>{guestName}</strong>}
            {guest.tableNumber && <span>Table {guest.tableNumber}</span>}
            {guest.maxPersons != null && <span>{guest.maxPersons} place{guest.maxPersons > 1 ? 's' : ''} maximum</span>}
          </div>
        </div>
        <div className="lp-ticket__foot"><span>Invitation · {guest.code}</span><span>À présenter à l'entrée</span></div>
      </Reveal>
      <div className="lp-ticket__actions lp-noprint">
        <button type="button" className="lp-btn lp-btn--ghost" onClick={download} disabled={busy}>{busy ? 'Téléchargement…' : 'Télécharger le QR code'}</button>
        <button type="button" className="lp-btn lp-btn--ghost" onClick={() => window.print()}>Imprimer le billet</button>
      </div>
      {msg && <p className="lp-ticketsec__p" role="alert">{msg}</p>}
    </section>
  );
}

function Closing({ invitation }) {
  const { namesLine, eventDate, contactPhone, contactWhatsapp } = invitation;
  const names = splitNames(namesLine);
  const ini = initials(names);
  const contactOn = !isDisabled(invitation, 'contact') && (contactPhone || contactWhatsapp);
  const date = eventDate ? formatEventDate(eventDate, { day: 'numeric', month: 'long', year: 'numeric' }) : null;
  return (
    <footer className="lp-closing" aria-label="Remerciements">
      <Reveal>
        <p className="lp-closing__mono" aria-hidden="true">{ini.f}{ini.s ? ' & ' : ''}{ini.s}</p>
        <p className="lp-closing__t">{getText(invitation, 'closingText')}</p>
        <Divider />
        <p className="lp-closing__names">{[namesLine, date].filter(Boolean).join(' · ')}</p>
        <p className="lp-eyebrow">{getText(invitation, 'closingBless')}</p>
        {contactOn && (
          <div className="lp-row">
            {contactWhatsapp && <a className="lp-btn" href={`https://wa.me/${contactWhatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">Écrire aux organisateurs<span className="lp-sr"> (WhatsApp, nouvel onglet)</span></a>}
            {contactPhone && <a className="lp-btn lp-btn--ghost" href={`tel:${contactPhone}`}>Appeler</a>}
          </div>
        )}
      </Reveal>
    </footer>
  );
}

// Fin de page : RÉPONSE (le formulaire de l'application, habillé ici : identification, présence, nombre de personnes, boisson, mot du
// livre d'or, photo facultative, verrouillage), billet QR personnel, puis remerciements.
export default function Finale(props) {
  const { invitation, slug } = props;
  const names = splitNames(props.namesLine);
  const who = names.second ? `${names.first} et ${names.second}` : names.first;
  return (
    <>
      <section className="lp-rsvp" id="rsvp-card" aria-label="Confirmer sa présence">
        <Reveal>
          <Head eyebrow={getText(invitation, 'rsvpEyebrow')} title={getText(invitation, 'rsvpTitle')} sub={who ? getText(invitation, 'rsvpSub').replace('{noms}', who) : 'Merci de confirmer votre présence.'} />
        </Reveal>
        <Reveal className="lp-form" delay={80}><RsvpSection {...props} /></Reveal>
      </section>
      <Ticket invitation={invitation} slug={slug} />
      <Closing invitation={invitation} />
    </>
  );
}
