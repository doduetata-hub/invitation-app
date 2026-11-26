import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../shared/auth/AuthContext';
import { api } from '../../shared/api/client';
import { useThemeToggle } from '../theme';
import { useCompact } from '../hooks/useMediaQuery';
import BottomSheet, { SheetItem } from '../components/ui/BottomSheet';
import Icon from '../components/ui/Icon';

// Dernière invitation consultée : celle de l'adresse en cours, sinon la dernière ouverte (gardée dans le navigateur —
// localStorage peut être indisponible, on s'en passe alors). Elle alimente les raccourcis « Jour J ».
const LAST_INVITATION_KEY = 'admin:last-invitation';
const INVITATION_ROUTE = /^\/admin\/invitations\/([^/]+)\/(?:edit|guests|guestbook|checkin)/;

function readLastInvitation() {
  try {
    return window.localStorage.getItem(LAST_INVITATION_KEY);
  } catch {
    return null;
  }
}

function useLastInvitation(pathname) {
  const fromRoute = pathname.match(INVITATION_ROUTE)?.[1] || null;
  const [stored, setStored] = useState(readLastInvitation);
  useEffect(() => {
    if (!fromRoute) return;
    setStored(fromRoute);
    try {
      window.localStorage.setItem(LAST_INVITATION_KEY, fromRoute);
    } catch {
      // stockage indisponible : les raccourcis suivent alors seulement l'invitation de l'adresse en cours
    }
  }, [fromRoute]);
  return fromRoute || stored;
}

const isNew = (pathname) => pathname === '/admin/invitations/new';

// Barre fixée en bas de l'écran (téléphone et tablette) et son panneau « Plus ».
export default function MobileNav({ open, onOpenChange }) {
  const compact = useCompact();
  const { pathname } = useLocation();
  const invitationId = useLastInvitation(pathname);

  if (!compact) return null;

  const link = (to, label, icon, active) => (
    <Link to={to} className={`bottom-nav__link${active ? ' active' : ''}`} aria-current={active ? 'page' : undefined}>
      <Icon name={icon} />
      <span>{label}</span>
    </Link>
  );
  const moreActive = open || pathname.startsWith('/admin/templates') || pathname.startsWith('/admin/settings');

  return (
    <>
      <nav className="bottom-nav" aria-label="Navigation principale">
        {link('/admin', 'Accueil', 'home', pathname === '/admin')}
        {link('/admin/clients', 'Clients', 'users', pathname.startsWith('/admin/clients'))}
        <Link to="/admin/invitations/new" className="bottom-nav__new" aria-label="Nouvelle invitation" aria-current={isNew(pathname) ? 'page' : undefined}>
          <Icon name="plus" />
        </Link>
        {link('/admin/invitations', 'Invitations', 'mail', pathname.startsWith('/admin/invitations') && !isNew(pathname))}
        <button type="button" className={`bottom-nav__link${moreActive ? ' active' : ''}`} onClick={() => onOpenChange(true)} aria-haspopup="dialog">
          <Icon name="more-horizontal" />
          <span>Plus</span>
        </button>
      </nav>
      {open && <MoreSheet invitationId={invitationId} onClose={() => onOpenChange(false)} />}
    </>
  );
}

function MoreSheet({ invitationId, onClose }) {
  const { admin, logout } = useAuth();
  const [theme, toggleTheme] = useThemeToggle();
  const [invitationTitle, setInvitationTitle] = useState('');

  useEffect(() => {
    if (!invitationId) return;
    // Seulement pour nommer les raccourcis : une invitation supprimée les laisse sans titre.
    api.get(`/invitations/${invitationId}`).then((data) => setInvitationTitle(data.title)).catch(() => {});
  }, [invitationId]);

  const base = `/admin/invitations/${invitationId}`;

  return (
    <BottomSheet title="Plus" subtitle={admin?.email} onClose={onClose}>
      {invitationId && (
        <>
          <p className="sheet__group">Jour J{invitationTitle ? ` · ${invitationTitle}` : ''}</p>
          <SheetItem icon="guestbook" label="Messages du livre d’or" to={`${base}/guestbook`} onDone={onClose} />
          <SheetItem icon="userCheck" label="Check-in" to={`${base}/checkin`} onDone={onClose} />
          <SheetItem icon="users" label="Invités" to={`${base}/guests`} onDone={onClose} />
          <p className="sheet__group">Atelier</p>
        </>
      )}
      <SheetItem icon="templates" label="Templates" to="/admin/templates" onDone={onClose} />
      <SheetItem icon="settings" label="Paramètres" to="/admin/settings" onDone={onClose} />
      <SheetItem icon={theme === 'dark' ? 'sun' : 'moon'} label={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'} onClick={toggleTheme} />
      <SheetItem icon="logout" label="Déconnexion" onClick={logout} onDone={onClose} />
    </BottomSheet>
  );
}
