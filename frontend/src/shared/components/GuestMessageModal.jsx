import { buildWhatsappShareUrl } from '../utils/whatsapp';

// Vue plein écran d'une réponse RSVP : la table `.table` tronque tout sur une seule ligne
// (white-space: nowrap, pour que les autres colonnes restent lisibles), donc un long message
// y est illisible aussi bien sur mobile que sur PC. Cette modale montre le texte complet,
// avec un retour à la ligne normal, et permet de répondre directement par WhatsApp quand un
// numéro est disponible (jamais le cas pour une réponse via le lien général, sans invité lié).
export default function GuestMessageModal({ name, answer, numberOfPersons, maxPersons, tableNumber, drink, message, respondedAt, phone, photoUrl, onRemovePhoto, onClose }) {
  const greeting = `Bonjour${name ? ' ' + name : ''}, merci beaucoup pour votre message !`;
  const whatsappUrl = phone ? buildWhatsappShareUrl(phone, greeting) : null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card modal-card--wide" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={onClose} className="modal-close" aria-label="Fermer">✕</button>

        <h3 style={{ margin: '0 0 0.4rem' }}>{name || 'Invité'}</h3>
        <div className="message-modal-meta">
          {answer === 'YES' && <span className="badge badge-success">Présent</span>}
          {answer === 'NO' && <span className="badge badge-danger">Absent</span>}
          {numberOfPersons != null && (
            <span className="badge">
              {numberOfPersons} personne{numberOfPersons > 1 ? 's' : ''}
              {maxPersons != null ? ` / ${maxPersons} max` : ''}
            </span>
          )}
          {tableNumber && <span className="badge">Table {tableNumber}</span>}
          {drink && <span className="badge">🥂 {drink}</span>}
        </div>

        {message ? (
          <p className="message-full-text">{message}</p>
        ) : (
          <p className="admin-muted" style={{ textAlign: 'left' }}>Aucun message laissé.</p>
        )}

        {photoUrl && (
          <div className="message-modal-photo">
            <img src={photoUrl} alt={`Photo jointe par ${name || 'l\'invité'}`} />
            {onRemovePhoto && (
              <button type="button" onClick={onRemovePhoto} className="btn btn-danger-outline btn-sm">
                Retirer la photo (le message est conservé)
              </button>
            )}
          </div>
        )}

        {respondedAt && (
          <p className="message-modal-date">Répondu le {new Date(respondedAt).toLocaleString('fr-FR')}</p>
        )}

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
          {whatsappUrl && (
            <a href={whatsappUrl} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm">
              💬 Répondre via WhatsApp
            </a>
          )}
          <button type="button" onClick={onClose} className="btn btn-outline btn-sm">
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
