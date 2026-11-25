import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../shared/auth/AuthContext';
import { getTheme, applyTheme, storeTheme, useAppliedTheme } from '../theme';
import '../../public/templates/laPorte/fonts.css'; // Cormorant + Jost, servies avec l'application (aucun service tiers)

// Icônes minimalistes (trait fin, currentColor) pour repérer chaque section d'un
// coup d'œil dans la barre latérale, sans dépendre d'une librairie externe.
const icons = {
  dashboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="3.5" width="7" height="7" rx="1" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1" />
    </svg>
  ),
  clients: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20c0-3.3 2.5-5.5 5.5-5.5s5.5 2.2 5.5 5.5" />
      <circle cx="17" cy="8.5" r="2.4" />
      <path d="M15 14.7c2.6.2 4.7 2.3 4.7 5.3" />
    </svg>
  ),
  invitations: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="5" width="17" height="14" rx="1.5" />
      <path d="M4 6.5l8 6.5 8-6.5" />
    </svg>
  ),
  templates: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="3.5" width="8" height="17" rx="1.2" />
      <rect x="13.5" y="3.5" width="7" height="7.5" rx="1.2" />
      <rect x="13.5" y="13" width="7" height="7.5" rx="1.2" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2M12 18.5v2M20.5 12h-2M5.5 12h-2M17.7 6.3l-1.4 1.4M7.7 16.3l-1.4 1.4M17.7 17.7l-1.4-1.4M7.7 7.7L6.3 6.3" />
    </svg>
  ),
};


// Icônes de la barre du bas (téléphone) : même trait fin que le menu latéral.
const quickIcons = {
  messages: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5.5h16v10H9.5L5.5 19v-3.5H4z" /></svg>,
  checkin: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8.5" /><path d="M8.2 12.3l2.5 2.5 5-5.4" /></svg>,
  guests: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3.2" /><path d="M3.5 20c0-3.3 2.5-5.5 5.5-5.5s5.5 2.2 5.5 5.5" /><circle cx="17" cy="8.5" r="2.4" /><path d="M15 14.7c2.6.2 4.7 2.3 4.7 5.3" /></svg>,
  home: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 11l8-6.5 8 6.5v8.5H4z" /><path d="M10 19.5v-5h4v5" /></svg>,
  invitations: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3.5" y="5" width="17" height="14" rx="1.5" /><path d="M4 6.5l8 6.5 8-6.5" /></svg>,
  menu: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>,
};

const navItems = [
  { to: '/admin', label: 'Tableau de bord', end: true, icon: 'dashboard' },
  { to: '/admin/clients', label: 'Clients', icon: 'clients' },
  { to: '/admin/invitations', label: 'Invitations', icon: 'invitations' },
  { to: '/admin/templates', label: 'Templates', icon: 'templates' },
  { to: '/admin/settings', label: 'Paramètres', icon: 'settings' },
];

// Barre d'accès rapide en bas de l'écran (téléphone) : mène en un appui aux sections d'une
// invitation, sans repasser par le menu puis la liste des invitations. L'invitation visée est celle
// de l'adresse en cours, sinon la dernière ouverte (gardée dans le navigateur — localStorage peut
// être indisponible, on s'en passe alors).
const LAST_INVITATION_KEY = 'admin:last-invitation';
const INVITATION_ROUTE = /^\/admin\/invitations\/([^/]+)\/(?:edit|guests|guestbook|checkin)/;

function readLastInvitation() {
  try {
    return window.localStorage.getItem(LAST_INVITATION_KEY);
  } catch {
    return null;
  }
}

export default function AdminLayout() {
  const { admin, logout } = useAuth();
  useAppliedTheme();
  const [theme, setTheme] = useState(getTheme);
  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    storeTheme(next);
    applyTheme(next);
  };
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { pathname } = useLocation();
  const routeInvitationId = pathname.match(INVITATION_ROUTE)?.[1] || null;
  const [lastInvitationId, setLastInvitationId] = useState(readLastInvitation);

  useEffect(() => {
    if (!routeInvitationId) return;
    setLastInvitationId(routeInvitationId);
    try {
      window.localStorage.setItem(LAST_INVITATION_KEY, routeInvitationId);
    } catch {
      // stockage indisponible : la barre suit alors seulement l'invitation de l'adresse en cours
    }
  }, [routeInvitationId]);

  const invitationId = routeInvitationId || lastInvitationId;
  const quickLinks = invitationId
    ? [
        { to: `/admin/invitations/${invitationId}/guestbook`, label: 'Messages', icon: quickIcons.messages },
        { to: `/admin/invitations/${invitationId}/checkin`, label: 'Check-in', icon: quickIcons.checkin },
        { to: `/admin/invitations/${invitationId}/guests`, label: 'Invités', icon: quickIcons.guests },
      ]
    : [
        { to: '/admin', label: 'Accueil', icon: quickIcons.home, end: true },
        { to: '/admin/invitations', label: 'Invitations', icon: quickIcons.invitations },
      ];

  return (
    <div className="admin-root app-shell">
      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}
      <aside className={`sidebar${sidebarOpen ? ' is-open' : ''}`}>
        <div className="sidebar-brand">
          <span className="sidebar-brand-mark">Invitations</span>
          <span className="sidebar-brand-tag">Atelier</span>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            >
              <span className="sidebar-icon">{icons[item.icon]}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <button
            type="button"
            className="menu-toggle"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label="Ouvrir le menu"
          >
            ☰
          </button>
          <span className="topbar-brand">Invitations</span>
          <span className="topbar-email">{admin?.email}</span>
          <button type="button" className="theme-toggle" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'} title={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}>
            {theme === 'dark' ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" /></svg>
            )}
            <span>{theme === 'dark' ? 'Clair' : 'Sombre'}</span>
          </button>
          <button onClick={logout} className="btn btn-outline btn-sm">
            Déconnexion
          </button>
        </header>
        <div className="content-area">
          <Outlet />
        </div>
      </div>
      <nav className="bottom-nav" aria-label="Accès rapide">
        {quickLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) => `bottom-nav-link${isActive ? ' active' : ''}`}
          >
            <span className="bottom-nav-icon" aria-hidden="true">{link.icon}</span>
            {link.label}
          </NavLink>
        ))}
        <button type="button" className="bottom-nav-link" onClick={() => setSidebarOpen(true)}>
          <span className="bottom-nav-icon" aria-hidden="true">{quickIcons.menu}</span>
          Menu
        </button>
      </nav>
    </div>
  );
}
