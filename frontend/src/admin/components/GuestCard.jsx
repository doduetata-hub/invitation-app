import RowActions from './ui/RowActions';
import Icon from './ui/Icon';

const EDIT_FIELDS = [
  { key: 'name', label: 'Nom' },
  { key: 'phone', label: 'Téléphone', type: 'tel' },
  { key: 'maxPersons', label: 'Nombre maximal de personnes', type: 'number' },
  { key: 'tableNumber', label: 'Table', list: 'table-suggestions' },
];

// « Table 2 » reste tel quel ; « 2 » ou « Roses » deviennent « Table 2 », « Table Roses ».
const tableLabel = (value) => (/^table/i.test(value) ? value : `Table ${value}`);

// Fiche d'un invité (téléphone et tablette), partagée entre l'administration et le lien d'accès client.
export default function GuestCard({
  guest, badge, locked, showDrink, editing, editForm, setEditForm, saving,
  onSave, onCancel, onEdit, onCopy, copied, onQr, onDelete, whatsappUrl, onMessage,
}) {
  const name = guest.name || guest.rsvp?.name || 'Invité sans nom';
  const persons = guest.rsvp?.numberOfPersons;

  if (editing) {
    return (
      <li className="stack-card">
        {EDIT_FIELDS.map((f) => (
          <label key={f.key} className="field">
            {f.label}
            <input
              type={f.type || 'text'}
              min={f.type === 'number' ? '1' : undefined}
              list={f.list}
              value={editForm[f.key]}
              onChange={(e) => setEditForm((current) => ({ ...current, [f.key]: e.target.value }))}
              className="input"
            />
          </label>
        ))}
        <div className="stack-card__actions">
          <button type="button" onClick={onSave} disabled={saving} className="btn btn-primary">
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
          <button type="button" onClick={onCancel} className="btn btn-outline">Annuler</button>
        </div>
      </li>
    );
  }

  const facts = [
    guest.tableNumber && tableLabel(guest.tableNumber),
    persons != null
      ? `${persons} personne${persons > 1 ? 's' : ''}${guest.maxPersons != null ? ` sur ${guest.maxPersons}` : ''}`
      : guest.maxPersons != null && `${guest.maxPersons} personne${guest.maxPersons > 1 ? 's' : ''} max.`,
    showDrink && guest.rsvp?.drink,
    guest.phone,
  ].filter(Boolean);

  return (
    <li className="stack-card">
      <div className="stack-card__head">
        <strong>{name}</strong>
        {badge}
        {guest.checkedInAt && <span className="badge badge-success">Arrivé</span>}
        <RowActions
          title={name}
          actions={[
            { icon: 'edit', label: 'Modifier', onClick: onEdit, disabled: locked },
            { icon: 'qr', label: 'Afficher le QR code', onClick: onQr },
            { icon: 'trash', label: 'Supprimer', onClick: onDelete, danger: true, disabled: locked },
          ]}
        />
      </div>
      {facts.length > 0 && (
        <p className="stack-card__facts">
          {facts.map((fact) => <span key={fact}>{fact}</span>)}
        </p>
      )}
      {guest.rsvp?.message && (
        <button type="button" className="stack-card__quote" onClick={onMessage}>
          {guest.rsvp.message}
        </button>
      )}
      <div className="stack-card__actions">
        <button type="button" onClick={onCopy} className={`btn btn-outline${copied ? ' btn-done' : ''}`}>
          <Icon name={copied ? 'check' : 'copy'} />
          {copied ? 'Copié !' : 'Copier'}
        </button>
        {whatsappUrl && (
          <a href={whatsappUrl} target="_blank" rel="noreferrer" className="btn btn-outline">
            <Icon name="chat" />
            WhatsApp
          </a>
        )}
        <button type="button" onClick={onQr} className="btn btn-outline">
          <Icon name="qr" />
          QR code
        </button>
      </div>
    </li>
  );
}
