import { useState } from 'react';
import Reveal from '../soireeKit/Reveal';
import { guestQrUrl } from '../../utils/guestQrUrl';
import RsvpSection from '../../sections/RsvpSection';
import { formatEventDate } from '../../../shared/utils/eventDateTime';
import { splitNames, initials, isDisabled, pad2 } from '../soireeKit/utils';
import { Head, Divider, Prop } from './Ornaments';
import { getText } from './texts';

// Billet d'accès : un billet de théâtre avec le QR code PERSONNEL de l'invité (celui de l'application), son nom, sa table et ses places.
// N'apparaît que si l'invité a ouvert son lien personnalisé (sans lien, l'application ne peut pas émettre de QR code).
function Ticket({ invitation, slug }) {
  const { guest, namesLine, eventDate, eventTime, venueName, title } = invitation;
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  if (!guest?.code || !slug) return null;
  const qrUrl = guestQrUrl(slug, guest);
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
    <section className="lr-ticketsec lr-dark" id="billet" aria-label="Votre billet d'accès">
      <Reveal>
        <Head eyebrow={getText(invitation, 'ticketEyebrow')} title={getText(invitation, 'ticketTitle')} sub={getText(invitation, 'ticketText')} />
      </Reveal>
      <Reveal className="lr-ticket" delay={80}>
        <div className="lr-ticket__main">
          <div className="lr-ticket__top"><span>{getText(invitation, 'ticketTop')}</span>{valid && <span>{pad2(d.getUTCDate())} · {pad2(d.getUTCMonth() + 1)} · {d.getUTCFullYear()}</span>}</div>
          {namesLine && <h3 className="lr-ticket__names">{namesLine}</h3>}
          <p className="lr-ticket__meta">{[title, eventTime].filter(Boolean).join(' · ')}{venueName && <><br />{venueName}</>}</p>
        </div>
        <div className="lr-ticket__stub">
          <div className="lr-ticket__qr"><img src={qrUrl} alt="Votre QR code d'accès" width="130" height="130" /></div>
          <div className="lr-ticket__guest">
            <span className="lr-ticket__k">Invité(e)</span>
            {guestName && <strong>{guestName}</strong>}
            {(guest.tableNumber || guest.maxPersons != null) && (
              <span>{[guest.tableNumber ? `Table ${guest.tableNumber}` : null, guest.maxPersons != null ? `${guest.maxPersons} place${guest.maxPersons > 1 ? 's' : ''} maximum` : null].filter(Boolean).join(' · ')}</span>
            )}
          </div>
          <div className="lr-ticket__foot"><span>Invitation · {guest.code}</span><span>À présenter à l'entrée</span></div>
        </div>
      </Reveal>
      <div className="lr-row lr-noprint">
        <button type="button" className="lr-btn" onClick={download} disabled={busy}>{busy ? 'Téléchargement…' : 'Télécharger le QR code'}</button>
        <button type="button" className="lr-btn" onClick={() => window.print()}>Imprimer le billet</button>
      </div>
      {msg && <p className="lr-ticketsec__p" role="alert">{msg}</p>}
    </section>
  );
}

// Dernier tableau : dans la salle, le rideau retombe sur les remerciements.
function Closing({ invitation }) {
  const { namesLine, eventDate, contactPhone, contactWhatsapp } = invitation;
  const names = splitNames(namesLine);
  const ini = initials(names);
  const contactOn = !isDisabled(invitation, 'contact') && (contactPhone || contactWhatsapp);
  const date = eventDate ? formatEventDate(eventDate, { day: 'numeric', month: 'long', year: 'numeric' }) : null;
  return (
    <footer className="lr-closing lr-dark" aria-label="Remerciements">
      <Reveal className="lr-final">
        <span className="lr-final__curtain" aria-hidden="true" />
        <div className="lr-final__in">
          <Prop name="roses" />
          <p className="lr-final__mono" aria-hidden="true">{ini.f}{ini.s ? ' & ' : ''}{ini.s}</p>
          <p className="lr-final__t">{getText(invitation, 'closingText')}</p>
          <Divider />
          <p className="lr-final__names">{[namesLine, date].filter(Boolean).join(' · ')}</p>
          <p className="lr-eyebrow">{getText(invitation, 'closingBless')}</p>
          {contactOn && (
            <div className="lr-row">
              {contactWhatsapp && <a className="lr-btn lr-btn--gold" href={`https://wa.me/${contactWhatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">Écrire aux organisateurs<span className="lr-sr"> (WhatsApp, nouvel onglet)</span></a>}
              {contactPhone && <a className="lr-btn" href={`tel:${contactPhone}`}>Appeler</a>}
            </div>
          )}
        </div>
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
      <section className="lr-rsvp lr-light" id="rsvp-card" aria-label="Confirmer sa présence">
        <Reveal>
          <Head eyebrow={getText(invitation, 'rsvpEyebrow')} title={getText(invitation, 'rsvpTitle')} sub={who ? getText(invitation, 'rsvpSub').replace('{noms}', who) : 'Merci de confirmer votre présence.'} prop="laurel" />
        </Reveal>
        <Reveal className="lr-form" delay={80}><RsvpSection {...props} /></Reveal>
      </section>
      <Ticket invitation={invitation} slug={slug} />
      <Closing invitation={invitation} />
    </>
  );
}
