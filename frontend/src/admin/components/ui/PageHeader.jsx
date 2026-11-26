import { Link } from 'react-router-dom';
import Icon from './Icon';

// En-tête commun des pages : contexte (retour), titre, sous-titre à gauche ; actions à droite.
export default function PageHeader({ title, subtitle, back, children }) {
  return (
    <header className="page-header">
      <div className="page-header__text">
        {back && (
          <Link to={back.to} className="page-context">
            <Icon name="arrowLeft" />
            {back.label}
          </Link>
        )}
        <h1>{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {children && <div className="page-header__actions">{children}</div>}
    </header>
  );
}
