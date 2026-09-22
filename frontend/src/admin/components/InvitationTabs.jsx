import { NavLink } from 'react-router-dom';

// Barre d'onglets partagée entre les pages d'une même invitation (édition, invités,
// check-in, livre d'or) : avant, chaque page ne proposait qu'un lien "← retour" vers
// l'édition, ce qui obligeait à repasser par là pour changer de section. Avec cette
// barre, les 4 sections sont visibles et accessibles en un clic depuis n'importe
// laquelle d'entre elles.
const TABS = [
  { to: 'edit', label: 'Éditer' },
  { to: 'guests', label: 'Invités' },
  { to: 'checkin', label: 'Check-in' },
  { to: 'guestbook', label: "Livre d'or" },
];

export default function InvitationTabs({ id }) {
  return (
    <nav className="invitation-tabs" aria-label="Sections de l'invitation">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={`/admin/invitations/${id}/${tab.to}`}
          className={({ isActive }) => `invitation-tab${isActive ? ' active' : ''}`}
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
