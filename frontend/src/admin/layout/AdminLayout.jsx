import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../shared/auth/AuthContext';

const navItems = [
  { to: '/admin', label: 'Tableau de bord', end: true },
  { to: '/admin/clients', label: 'Clients' },
  { to: '/admin/invitations', label: 'Invitations' },
  { to: '/admin/templates', label: 'Templates' },
  { to: '/admin/settings', label: 'Paramètres' },
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
