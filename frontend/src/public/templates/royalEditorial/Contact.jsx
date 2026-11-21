import Reveal from './Reveal';
import { formatEventDate } from '../../../shared/utils/eventDateTime';

// Contacts : uniquement les actions réellement disponibles (WhatsApp, téléphone) — celles de l'organisateur.
export default function Contact({ invitation }) {
  const { contactPhone, contactWhatsapp, namesLine, eventDate } = invitation;
  if (!contactPhone && !contactWhatsapp) return null;
  const date = eventDate ? formatEventDate(eventDate, { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.') : null;

  return (
    <div className="re-dark re-band">
      <div className="re-wrap">
        <div className="re-contact">
          <Reveal>
            <span className="re-kicker re-kicker--gold">Une question ?</span>
            <p className={`re-contact__sign${(namesLine || '').length > 28 ? ' re-contact__sign--long' : ''}`} style={{ marginTop: '1rem' }}>{namesLine || 'Contactez-nous'}</p>
          </Reveal>
          <Reveal delay={80}>
            <div className="re-btnrow" style={{ marginTop: 0 }}>
              {contactWhatsapp && (
                <a className="re-btn" href={`https://wa.me/${contactWhatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
                  WhatsApp<span className="re-sr"> (nouvel onglet)</span>
                </a>
              )}
              {contactPhone && (
                <a className="re-btn" href={`tel:${contactPhone}`}>
                  Appeler
                </a>
              )}
            </div>
          </Reveal>
        </div>
        <div className="re-end">
          <span>{namesLine}</span>
          {date && <span>{date}</span>}
        </div>
      </div>
    </div>
  );
}
