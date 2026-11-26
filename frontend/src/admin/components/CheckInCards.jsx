import Icon from './ui/Icon';

// Liste de pointage sur téléphone et tablette : un grand bouton par personne, sans défilement latéral.
// `entries` : { key, name, answer, checkedInAt, onToggle }.
export default function CheckInCards({ entries }) {
  if (entries.length === 0) return <div className="empty-state">Aucun invité à afficher.</div>;
  return (
    <ul className="card-list">
      {entries.map((entry) => (
        <li key={entry.key} className="stack-card">
          <div className="stack-card__head">
            <strong>{entry.name}</strong>
            {entry.checkedInAt && (
              <span className="badge badge-success">Arrivé à {new Date(entry.checkedInAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
            )}
          </div>
          <p className="stack-card__facts">Réponse : {entry.answer}</p>
          <button type="button" onClick={entry.onToggle} className={`btn ${entry.checkedInAt ? 'btn-danger-outline' : 'btn-primary'}`}>
            {!entry.checkedInAt && <Icon name="check" />}
            {entry.checkedInAt ? 'Annuler l’arrivée' : 'Marquer arrivé'}
          </button>
        </li>
      ))}
    </ul>
  );
}
