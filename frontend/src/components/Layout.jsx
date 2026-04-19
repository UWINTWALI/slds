import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const NAV = [
  { to: '/',           icon: '⌂',  label: 'Home' },
  { to: '/national',   icon: '◉',  label: 'National Overview',  role: 'MINALOC / RISA' },
  { to: '/district',   icon: '⊞',  label: 'District Planner',   role: 'District Officers' },
  { to: '/sector',     icon: '◎',  label: 'Sector Planner',     role: 'Sector Officers' },
  { to: '/simulation', icon: '⟳',  label: 'Simulation',         role: 'All users' },
]

export default function Layout() {
  const { pathname }    = useLocation()
  const { user, logout} = useAuth()
  const navigate        = useNavigate()

  const current = NAV.find(n => n.to !== '/' && pathname.startsWith(n.to))
               || NAV.find(n => n.to === pathname)

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="app-shell">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-mark">SL</div>
          <div>
            <div className="sidebar-logo-text">SLDS</div>
            <div className="sidebar-logo-sub">Rwanda · 2026</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Navigation</div>
          {NAV.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
            >
              <span className="nav-icon">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* ── User panel ── */}
        {user && (
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">
              {user.name?.charAt(0).toUpperCase() ?? 'A'}
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user.name}</div>
              <div className="sidebar-user-role">{user.role}</div>
            </div>
            <button
              className="sidebar-logout-btn"
              onClick={handleLogout}
              title="Sign out"
            >
              ⏻
            </button>
          </div>
        )}

        <div className="sidebar-footer">
          Sector-Level Development<br />
          Simulator v1.0<br />
          University of Rwanda
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="main-content">
        <div className="page-header">
          <div>
            <div className="page-title">{current?.label ?? 'SLDS'}</div>
            {current?.role && (
              <div className="page-subtitle">For {current.role}</div>
            )}
          </div>
          {user && (
            <div className="header-user-pill">
              <span className="header-user-dot" />
              {user.name} · {user.role}
            </div>
          )}
        </div>
        <div className="page-body">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
