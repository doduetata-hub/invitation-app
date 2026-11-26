import { Link } from 'react-router-dom';
import { STATUS_LABELS, STATUS_BADGE_CLASS } from '../../shared/constants/invitations';
import InvitationActions from './InvitationActions';

// Fiche d'une invitation (téléphone et tablette) : toute la fiche ouvre l'éditeur, le bouton « ⋮ » les autres pages.
export default function InvitationCard({ id, title, client, template, date, dateLabel, status, publicSlug }) {
  return (
    <li className="list-card">
      <div className="list-card__main">
        <Link to={`/admin/invitations/${id}/edit`} className="list-card__title">{title}</Link>
        {client && <span className="list-card__sub">{client}</span>}
        <span className="list-card__meta">
          <span className={STATUS_BADGE_CLASS[status]}>{STATUS_LABELS[status]}</span>
          <span>{date ? `${dateLabel ? `${dateLabel} ` : ''}${date}` : 'Date à définir'}</span>
          {template && <span>{template}</span>}
        </span>
      </div>
      <div className="list-card__side">
        <InvitationActions id={id} title={title} publicSlug={publicSlug} />
      </div>
    </li>
  );
}
