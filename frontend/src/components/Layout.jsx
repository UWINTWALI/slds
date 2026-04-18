import { NavLink, Outlet, useLocation } from 'react-router-dom'

const NAV = [
  { to: '/',           icon: '⌂',  label: 'Home' },
  { to: '/national',   icon: '◉',  label: 'National Overview',  role: 'MINALOC / RISA' },
  { to: '/district',   icon: '⊞',  label: 'District Planner',   role: 'District Officers' },
  { to: '/sector',     icon: '◎',  label: 'Sector Planner',     role: 'Sector Officers' },
  { to: '/simulation', icon: '⟳',  label: 'Simulation',         role: 'All users' },
]

export default function Layout() {
  const { pathname } = useLocation()
  const current = NAV.find(n => n.to !== '/' && pathname.startsWith(n.to))
               || NAV.find(n => n.to === pathname)

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
        </div>
        <div className="page-body">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
