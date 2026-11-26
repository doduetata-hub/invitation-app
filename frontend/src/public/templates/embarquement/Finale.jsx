import { useState } from 'react';
import Reveal from '../soireeKit/Reveal';
import RsvpSection from '../../sections/RsvpSection';
import { splitNames, isDisabled } from '../soireeKit/utils';
import { Head, Divider } from './Ornaments';
import { getText } from './texts';
import { flightOf } from './flight';
import cloudAUrl from './assets/cloud-a.webp';
import cloudCUrl from './assets/cloud-c.webp';
import ringsUrl from './assets/stamp-rings.webp';

// Billet d'accès : la carte d'embarquement et sa souche, avec le QR code PERSONNEL de l'invité (celui de l'application), son nom, sa table
// et ses places. N'apparaît que si l'invité a ouvert son lien personnalisé (sans lien, l'application ne peut pas émettre de QR code).
function Ticket({ invitation, slug }) {
  const { guest, namesLine, title } = invitation;
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  if (!guest?.code || !slug) return null;
  const qrUrl = `/api/public/invitations/${slug}/qrcode?guest=${encodeURIComponent(guest.code)}`;
  const flight = flightOf(invitation);
  const download = async () => {
    setBusy(true);
    setMsg('');
    try {
      const res = await fetch(qrUrl);
      if (!res.ok) throw new Error('qr');
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement('a');
      a.href = url;
      a.download = `QR-acces-${(flight.passenger || 'invite').replace(/\s+/g, '-')}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setMsg('Le QR code est momentanément indisponible. Réessayez dans un instant.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="em-ticketsec em-dark" id="billet" aria-label="Votre billet d'accès">
      <Reveal>
        <Head eyebrow={getText(invitation, 'ticketEyebrow')} title={getText(invitation, 'ticketTitle')} sub={getText(invitation, 'ticketText')} />
      </Reveal>
      <Reveal className="em-ticket" delay={80}>
        <div className="em-ticket__main">
          <p className="em-ticket__top"><span>{getText(invitation, 'ticketTop')}</span><b>{flight.code}</b></p>
          <h3 className="em-ticket__names">{namesLine || title}</h3>
          <img className="em-ticket__stamp" src={ringsUrl} alt="" aria-hidden="true" />
          <dl className="em-ticket__grid">
            <div className="em-ticket__wide"><dt>Passager</dt><dd>{flight.passenger || 'Notre invité(e)'}</dd></div>
            {flight.day && <div><dt>Date</dt><dd>{flight.day}</dd></div>}
            {flight.time && <div><dt>Heure</dt><dd>{flight.time}</dd></div>}
            {flight.seat && <div><dt>Table</dt><dd>{flight.seat}</dd></div>}
            {guest.maxPersons != null && <div><dt>Places</dt><dd>{guest.maxPersons} max</dd></div>}
            {flight.destination && <div className="em-ticket__wide"><dt>Destination</dt><dd>{flight.destination}</dd></div>}
          </dl>
        </div>
        <div className="em-ticket__stub">
          <div className="em-ticket__qr"><img src={qrUrl} alt="Votre QR code d'accès" width="140" height="140" /></div>
          <p>Invitation · {guest.code}</p>
          <p>À présenter à l'entrée</p>
        </div>
      </Reveal>
      <div className="em-row em-noprint">
        <button type="button" className="em-btn" onClick={download} disabled={busy}>{busy ? 'Téléchargement…' : 'Télécharger le QR code'}</button>
        <button type="button" className="em-btn" onClick={() => window.print()}>Imprimer le billet</button>
      </div>
      {msg && <p className="em-ticketsec__p" role="alert">{msg}</p>}
    </section>
  );
}

function Closing({ invitation }) {
  const { namesLine, contactPhone, contactWhatsapp } = invitation;
  const flight = flightOf(invitation);
  const { ini } = flight;
  const contactOn = !isDisabled(invitation, 'contact') && (contactPhone || contactWhatsapp);
  return (
    <footer className="em-closing em-dark" aria-label="Remerciements">
      <img className="em-closing__cloud em-closing__cloud--a" src={cloudCUrl} alt="" aria-hidden="true" loading="lazy" />
      <img className="em-closing__cloud em-closing__cloud--b" src={cloudAUrl} alt="" aria-hidden="true" loading="lazy" />
      <Reveal className="em-closing__in">
        <p className="em-closing__mono" aria-hidden="true">{ini.f}{ini.s ? ' & ' : ''}{ini.s}</p>
        <p className="em-closing__t">{getText(invitation, 'closingText')}</p>
        <Divider />
        <p className="em-closing__names">{[namesLine, flight.long].filter(Boolean).join(' · ')}</p>
        <p className="em-eyebrow">{getText(invitation, 'closingBless')}</p>
        {contactOn && (
          <div className="em-row">
            {contactWhatsapp && <a className="em-btn em-btn--coral" href={`https://wa.me/${contactWhatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">Écrire aux organisateurs<span className="em-sr"> (WhatsApp, nouvel onglet)</span></a>}
            {contactPhone && <a className="em-btn" href={`tel:${contactPhone}`}>Appeler</a>}
          </div>
        )}
      </Reveal>
    </footer>
  );
}

// Fin de page : ENREGISTREMENT (le formulaire de réponse de l'application, habillé ici : identification, présence, nombre de personnes,
// boisson, mot du livre d'or, photo facultative, verrouillage), billet QR personnel, puis remerciements.
export default function Finale(props) {
  const { invitation, slug } = props;
  const names = splitNames(props.namesLine);
  const who = names.second ? `${names.first} et ${names.second}` : names.first;
  return (
    <>
      <section className="em-rsvp em-light" id="rsvp-card" aria-label="Confirmer sa présence">
        <Reveal>
          <Head eyebrow={getText(invitation, 'rsvpEyebrow')} title={getText(invitation, 'rsvpTitle')} sub={who ? getText(invitation, 'rsvpSub').replace('{noms}', who) : 'Merci de confirmer votre présence.'} />
        </Reveal>
        <Reveal className="em-desk" delay={80}>
          <p className="em-desk__top">{getText(invitation, 'rsvpDesk')}</p>
          <div className="em-form"><RsvpSection {...props} /></div>
        </Reveal>
      </section>
      <Ticket invitation={invitation} slug={slug} />
      <Closing invitation={invitation} />
    </>
  );
}
