import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../shared/auth/AuthContext';

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

const navItems = [
  { to: '/admin', label: 'Tableau de bord', end: true, icon: 'dashboard' },
  { to: '/admin/clients', label: 'Clients', icon: 'clients' },
  { to: '/admin/invitations', label: 'Invitations', icon: 'invitations' },
  { to: '/admin/templates', label: 'Templates', icon: 'templates' },
  { to: '/admin/settings', label: 'Paramètres', icon: 'settings' },
];

export default function AdminLayout() {
  const { admin, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
          <button onClick={logout} className="btn btn-outline btn-sm">
            Déconnexion
          </button>
        </header>
        <div className="content-area">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
