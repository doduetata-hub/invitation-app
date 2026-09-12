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

  return (
    <div className="admin-root app-shell">
      <aside className="sidebar">
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
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="main-column">
        <header className="topbar">
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
