import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth, ROLE_META } from '../context/AuthContext'
import { useRole }            from '../hooks/useRole'
import { useTheme }           from '../context/ThemeContext'
import {
  IconHome, IconGlobe, IconMap, IconMapPin,
  IconFlask, IconUsers, IconLogOut, IconSun, IconMoon,
} from './Icons'

/* ── Role-specific navigation ───────────────────────────────────────────────── */
const ROLE_NAV = {
  national_admin: [
    { to: '/',           Icon: IconHome,    label: 'Operations Center' },
    { to: '/national',   Icon: IconGlobe,   label: 'National Map' },
    { to: '/district',   Icon: IconMap,     label: 'District Reports' },
    { to: '/simulation', Icon: IconFlask,   label: 'Simulation' },
    { to: '/users',      Icon: IconUsers,   label: 'User Management' },
  ],
  district_officer: [
    { to: '/',           Icon: IconHome,    label: 'District Center' },
    { to: '/district',   Icon: IconMap,     label: 'District Overview' },
    { to: '/sector',     Icon: IconMapPin,  label: 'Sector Reports' },
    { to: '/simulation', Icon: IconFlask,   label: 'Simulation' },
  ],
  sector_officer: [
    { to: '/',           Icon: IconHome,    label: 'Sector Dashboard' },
    { to: '/sector',     Icon: IconMapPin,  label: 'My Sector' },
    { to: '/simulation', Icon: IconFlask,   label: 'Simulate Investment' },
  ],
  analyst: [
    { to: '/',           Icon: IconHome,    label: 'Research Center' },
    { to: '/national',   Icon: IconGlobe,   label: 'National Overview' },
    { to: '/district',   Icon: IconMap,     label: 'District Planner' },
    { to: '/sector',     Icon: IconMapPin,  label: 'Sector Planner' },
    { to: '/simulation', Icon: IconFlask,   label: 'Simulation' },
  ],
}

/* ── Role section labels ───────────────────────────────────────────────────── */
const ROLE_SECTION = {
  national_admin:   'MINALOC / RISA',
  district_officer: 'District Administration',
  sector_officer:   'Sector Administration',
  analyst:          'Research & Analysis',
}

export default function Layout() {
  const { pathname }           = useLocation()
  const { user, logout }       = useAuth()
  const { role, meta }         = useRole()
  const navigate               = useNavigate()
  const { theme, toggleTheme } = useTheme()

  const nav = ROLE_NAV[role] ?? ROLE_NAV.analyst

  // Find the current page title for the header
  const allNavFlat = Object.values(ROLE_NAV).flat()
  const current = allNavFlat.find(n => n.to !== '/' && pathname.startsWith(n.to))
             || allNavFlat.find(n => n.to === pathname)

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
          <div style={{ minWidth: 0 }}>
            <div style={{ color: meta.color, fontWeight: 700, fontSize: 11, lineHeight: 1.3 }}>{meta.label}</div>
            {user?.district && (
              <div style={{ color: meta.color, opacity: 0.65, fontSize: 10, lineHeight: 1.3 }}>
                {user.district}{user.sector ? ` / ${user.sector}` : ''}
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <div className="nav-section-label">{ROLE_SECTION[role] ?? 'Navigation'}</div>
          {nav.map(({ to, Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
              style={({ isActive }) => isActive ? { borderRightColor: meta.accent } : {}}
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* User info */}
        {user && (
          <div className="sidebar-user">
            <div className="sidebar-user-avatar" style={{ background: meta.accent }}>
              {user.name?.charAt(0).toUpperCase() ?? 'A'}
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user.name}</div>
              <div className="sidebar-user-role">{user.title ?? meta.label}</div>
            </div>
          </div>
        )}

        {/* Logout button */}
        <button className="sidebar-logout-btn" onClick={handleLogout}>
          <IconLogOut size={15} />
          Logout
        </button>

        {/* Theme toggle */}
        <button className="theme-toggle-btn" onClick={toggleTheme}>
          {theme === 'dark'
            ? <IconSun  size={14} />
            : <IconMoon size={14} />
          }
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </button>

        <div className="sidebar-footer">
          Sector-Level Development<br />
          Simulator v1.0<br />
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="main-content">
        <div className="page-header">
          <div>
            <div className="page-title">{current?.label ?? 'Dashboard'}</div>
            {role === 'national_admin' && (
              <div className="page-subtitle">Ministry Operations — Full national visibility</div>
            )}
            {role === 'district_officer' && user?.district && (
              <div className="page-subtitle">{user.district} District Administration</div>
            )}
            {role === 'sector_officer' && user?.sector && (
              <div className="page-subtitle">{user.sector} Sector · {user.district} District</div>
            )}
            {role === 'analyst' && (
              <div className="page-subtitle">Research & Policy Analysis</div>
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
