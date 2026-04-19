import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth, ROLE_META } from '../context/AuthContext'
import { useRole } from '../hooks/useRole'

const ALL_NAV = [
  {
    to:    '/',
    icon:  '⌂',
    label: 'Home',
    roles: ['national_admin', 'district_officer', 'sector_officer', 'analyst'],
  },
  {
    to:    '/national',
    icon:  '◉',
    label: 'National Overview',
    sub:   'MINALOC / RISA',
    roles: ['national_admin', 'analyst'],
  },
  {
    to:    '/district',
    icon:  '⊞',
    label: 'District Planner',
    sub:   'District Officers',
    roles: ['national_admin', 'district_officer', 'sector_officer', 'analyst'],
  },
  {
    to:    '/sector',
    icon:  '◎',
    label: 'Sector Planner',
    sub:   'Sector Officers',
    roles: ['national_admin', 'district_officer', 'sector_officer', 'analyst'],
  },
  {
    to:    '/simulation',
    icon:  '⟳',
    label: 'Simulation',
    sub:   'All users',
    roles: ['national_admin', 'district_officer', 'sector_officer', 'analyst'],
  },
]

export default function Layout() {
  const { pathname }     = useLocation()
  const { user, logout } = useAuth()
  const { role, meta }   = useRole()
  const navigate         = useNavigate()

  const nav = ALL_NAV.filter(n => n.roles.includes(role))

  const current = ALL_NAV.find(n => n.to !== '/' && pathname.startsWith(n.to))
               || ALL_NAV.find(n => n.to === pathname)

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="app-shell">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-mark" style={{ background: meta.accent }}>SL</div>
          <div>
            <div className="sidebar-logo-text">SLDS</div>
            <div className="sidebar-logo-sub">Rwanda · 2026</div>
          </div>
        </div>

        {/* Role badge */}
        <div className="sidebar-role-badge" style={{ background: meta.bg, borderColor: meta.dot + '33' }}>
          <span className="role-dot" style={{ background: meta.dot }} />
          <span style={{ color: meta.color, fontWeight: 600, fontSize: 11 }}>{meta.label}</span>
          {user?.district && (
            <span style={{ color: meta.color, opacity: 0.7, fontSize: 10, marginLeft: 4 }}>
              · {user.district}
            </span>
          )}
          {user?.sector && (
            <span style={{ color: meta.color, opacity: 0.7, fontSize: 10, marginLeft: 2 }}>
              / {user.sector}
            </span>
          )}
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <div className="nav-section-label">Navigation</div>
          {nav.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
              style={({ isActive }) => isActive
                ? { borderRightColor: meta.accent }
                : {}
              }
            >
              <span className="nav-icon">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User panel */}
        {user && (
          <div className="sidebar-user">
            <div className="sidebar-user-avatar" style={{ background: meta.accent }}>
              {user.name?.charAt(0).toUpperCase() ?? 'A'}
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user.name}</div>
              <div className="sidebar-user-role">{user.title}</div>
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
            {current?.sub && (
              <div className="page-subtitle">For {current.sub}</div>
            )}
          </div>
          {user && (
            <div className="header-user-pill" style={{ borderColor: meta.dot + '40' }}>
              <span className="header-user-dot" style={{ background: meta.dot }} />
              <span>{user.name}</span>
              <span style={{ color: 'var(--gray-400)', margin: '0 4px' }}>·</span>
              <span style={{ color: meta.color, fontWeight: 600 }}>{meta.label}</span>
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
