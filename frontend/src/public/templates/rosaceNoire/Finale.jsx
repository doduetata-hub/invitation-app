import { useState } from 'react';
import Reveal from '../soireeKit/Reveal';
import RsvpSection from '../../sections/RsvpSection';
import { formatEventDate } from '../../../shared/utils/eventDateTime';
import { splitNames, initials, isDisabled, pad2 } from '../soireeKit/utils';

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
    <section className="nv-ticketsec" id="billet" aria-label="Votre billet d'accès">
      <Reveal>
        <p className="nv-eyebrow nv-eyebrow--ink">Votre accès personnel</p>
        <h2 className="nv-h2">Le billet<br /><em>des mariés.</em></h2>
        <p className="nv-ticketsec__p">Présentez ce QR code à l'accueil le jour de la cérémonie.</p>
      </Reveal>
      <Reveal className="nv-ticket" delay={80}>
        <div className="nv-ticket__top"><span>Accès cérémonie</span>{valid && <span>{pad2(d.getUTCDate())} · {pad2(d.getUTCMonth() + 1)} · {d.getUTCFullYear()}</span>}</div>
        {namesLine && <h3 className="nv-ticket__names">{namesLine}</h3>}
        <p className="nv-ticket__meta">{[title || 'Mariage religieux', eventTime].filter(Boolean).join(' · ')}{venueName && <><br />{venueName}</>}</p>
        <div className="nv-ticket__body">
          <div className="nv-ticket__qr"><img src={qrUrl} alt="Votre QR code d'accès" width="110" height="110" /></div>
          <div className="nv-ticket__guest">
            <span className="nv-eyebrow">Invité(e)</span>
            {guestName && <strong>{guestName}</strong>}
            {guest.tableNumber && <span>Table {guest.tableNumber}</span>}
            {guest.maxPersons != null && <span>{guest.maxPersons} place{guest.maxPersons > 1 ? 's' : ''} maximum</span>}
          </div>
        </div>
        <div className="nv-ticket__foot"><span>Invitation · {guest.code}</span><span>À présenter à l'entrée</span></div>
      </Reveal>
      <div className="nv-ticket__actions nv-noprint">
        <button type="button" className="nv-btn nv-btn--ghost" onClick={download} disabled={busy}>{busy ? 'Téléchargement…' : 'Télécharger le QR code'}</button>
        <button type="button" className="nv-btn nv-btn--ghost" onClick={() => window.print()}>Imprimer le billet</button>
      </div>
      {msg && <p className="nv-ticketsec__p" role="alert">{msg}</p>}
    </section>
  );
}

function Closing({ invitation, slug }) {
  const { namesLine, eventDate, contactPhone, contactWhatsapp } = invitation;
  const names = splitNames(namesLine);
  const ini = initials(names);
  const [copied, setCopied] = useState(false);
  const contactOn = !isDisabled(invitation, 'contact') && (contactPhone || contactWhatsapp);
  const url = slug && typeof window !== 'undefined' ? `${window.location.origin}/i/${encodeURIComponent(slug)}` : null;
  const text = `${namesLine ? `Invitation de ${namesLine}` : 'Invitation'}${url ? ` — ${url}` : ''}`;
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const date = eventDate ? formatEventDate(eventDate, { day: 'numeric', month: 'long', year: 'numeric' }) : null;
  const share = async () => { try { await navigator.share({ title: namesLine || 'Invitation', text: namesLine ? `Invitation de ${namesLine}` : 'Invitation', url }); } catch { /* annulé */ } };
  const copy = async () => { try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch { /* indisponible */ } };
  return (
    <footer className="nv-closing" aria-label="Remerciements">
      <Reveal>
        <p className="nv-mono2 nv-mono2--light" aria-hidden="true">{ini.f}{ini.s ? ' & ' : ''}{ini.s}</p>
        <p className="nv-closing__t">Merci de partager avec nous ce jour béni. Votre présence et vos prières rendront ce moment encore plus précieux.</p>
        <span className="nv-rule" aria-hidden="true" />
        <p className="nv-closing__names">{[namesLine, date].filter(Boolean).join(' · ')}</p>
        <p className="nv-eyebrow">Que Dieu bénisse cette union.</p>
        {contactOn && (
          <div className="nv-row">
            {contactWhatsapp && <a className="nv-btn" href={`https://wa.me/${contactWhatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">Écrire aux organisateurs<span className="nv-sr"> (WhatsApp, nouvel onglet)</span></a>}
            {contactPhone && <a className="nv-btn nv-btn--line" href={`tel:${contactPhone}`}>Appeler</a>}
          </div>
        )}
        {url && (
          <div className="nv-share nv-noprint">
            <span className="nv-eyebrow">Partager l'invitation</span>
            <div className="nv-row">
              <a className="nv-btn nv-btn--line" href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer">WhatsApp<span className="nv-sr"> (nouvel onglet)</span></a>
              {canShare && <button type="button" className="nv-btn nv-btn--line" onClick={share}>Partager</button>}
              <button type="button" className="nv-btn nv-btn--line" onClick={copy}>{copied ? 'Lien copié ✓' : 'Copier le lien'}</button>
            </div>
            <p className="nv-sr" role="status">{copied ? 'Lien copié dans le presse-papiers' : ''}</p>
          </div>
        )}
      </Reveal>
    </footer>
  );
}

// Fin de page : RÉPONSE (le formulaire de l'application, habillé ici : identification, présence, nombre de personnes, boisson, mot du
// livre d'or, photo facultative, verrouillage), billet QR personnel, puis remerciements et partage.
export default function Finale(props) {
  const { invitation, slug } = props;
  const names = splitNames(props.namesLine);
  const who = names.second ? `${names.first} et ${names.second}` : names.first;
  return (
    <>
      <section className="nv-rsvp" id="rsvp-card" aria-label="Confirmer sa présence">
        <Reveal>
          <p className="nv-eyebrow nv-eyebrow--ink">Votre présence compte</p>
          <h2 className="nv-h2">Confirmez<br /><em>votre venue.</em></h2>
          <p className="nv-rsvp__sub">{who ? `${who} seront heureux de vous compter parmi eux.` : 'Merci de confirmer votre présence.'}</p>
        </Reveal>
        <Reveal className="nv-rsvp__form" delay={80}><RsvpSection {...props} /></Reveal>
      </section>
      <Ticket invitation={invitation} slug={slug} />
      <Closing invitation={invitation} slug={slug} />
    </>
  );
}
