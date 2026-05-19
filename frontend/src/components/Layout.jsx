import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth, ROLE_META } from '../context/AuthContext'
import { useRole }            from '../hooks/useRole'
import { useTheme }           from '../context/ThemeContext'
import logo from '../logo/slds_logo.png'
import {
  IconHome, IconGlobe, IconMap, IconMapPin,
  IconFlask, IconUsers, IconSettings, IconLogOut, IconSun, IconMoon,
  IconFileText,
} from './Icons'
import NotificationBell from './NotificationBell'

/* ── Role-specific navigation  */
const REPORTS_NAV = { to: '/reports', Icon: IconFileText, label: 'Reports Inbox' }

const ROLE_NAV = {
  national_admin: [
    { to: '/',           Icon: IconHome,    label: 'Operations Center' },
    { to: '/national',   Icon: IconGlobe,   label: 'National Map' },
    { to: '/district',   Icon: IconMap,     label: 'District Reports' },
    REPORTS_NAV,
    { to: '/simulation', Icon: IconFlask,   label: 'Simulation' },
    { to: '/users',      Icon: IconUsers,   label: 'User Management' },
    { to: '/settings',   Icon: IconSettings, label: 'Settings' },
  ],
  district_officer: [
    { to: '/',           Icon: IconHome,    label: 'District Center' },
    { to: '/district',   Icon: IconMap,     label: 'District Overview' },
    { to: '/sector',     Icon: IconMapPin,  label: 'Sector Reports' },
    REPORTS_NAV,
    { to: '/simulation', Icon: IconFlask,   label: 'Simulation' },
    { to: '/settings',   Icon: IconSettings, label: 'Settings' },
  ],
  sector_officer: [
    { to: '/',           Icon: IconHome,    label: 'Sector Dashboard' },
    { to: '/sector',     Icon: IconMapPin,  label: 'My Sector' },
    REPORTS_NAV,
    { to: '/simulation', Icon: IconFlask,   label: 'Simulate Investment' },
    { to: '/settings',   Icon: IconSettings, label: 'Settings' },
  ],
  analyst: [
    { to: '/',           Icon: IconHome,    label: 'Research Center' },
    { to: '/national',   Icon: IconGlobe,   label: 'National Overview' },
    { to: '/district',   Icon: IconMap,     label: 'District Planner' },
    { to: '/sector',     Icon: IconMapPin,  label: 'Sector Planner' },
    REPORTS_NAV,
    { to: '/simulation', Icon: IconFlask,   label: 'Simulation' },
    { to: '/settings',   Icon: IconSettings, label: 'Settings' },
  ],
}

/* ── Role section labels  */
const ROLE_SECTION = {
  national_admin:   'MINALOC / RISA',
  district_officer: 'District Administration',
  sector_officer:   'Sector Administration',
  analyst:          'Research & Analysis',
}

function LoginWarningBanner() {
  const [msg, setMsg] = useState(() => sessionStorage.getItem('slds_login_warning'))
  if (!msg) return null
  return (
    <div className="alert alert-warning" style={{ marginBottom: 16, fontSize: 12 }}>
      {msg}
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        style={{ marginLeft: 12, fontSize: 11 }}
        onClick={() => {
          sessionStorage.removeItem('slds_login_warning')
          setMsg(null)
        }}
      >
        Dismiss
      </button>
    </div>
  )
}

export default function Layout() {
  const { pathname }           = useLocation()
  const { user, logout }       = useAuth()
  const { role, meta }         = useRole()
  const navigate               = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef                = useRef(null)

  const nav = ROLE_NAV[role] ?? ROLE_NAV.analyst

  // Find the current page title for the header
  const allNavFlat = Object.values(ROLE_NAV).flat()
  const current = allNavFlat.find(n => n.to !== '/' && pathname.startsWith(n.to))
             || allNavFlat.find(n => n.to === pathname)

  useEffect(() => {
    const title = current?.label ?? 'Dashboard'
    document.title = `${title} · Sector-Level Development Simulator`
  }, [current?.label])

  useEffect(() => {
    if (!menuOpen) return
    function handleOutsideClick(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false)
      }
    }
    window.addEventListener('mousedown', handleOutsideClick)
    return () => window.removeEventListener('mousedown', handleOutsideClick)
  }, [menuOpen])

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  function goToSettings() {
    navigate('/settings')
    setMenuOpen(false)
  }

  return (
    <div className="app-shell">
      {/* ── Sidebar ── */}
      <aside className="sidebar" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>

        {/* Top section - fixed, doesn't scroll */}
        <div style={{ flexShrink: 0 }}>
          {/* Logo */}
          <div className="sidebar-logo" style={{ marginBottom: '24px' }}>
            <div className="sidebar-logo-mark">
              <img src={logo} alt="SLDS logo" />
            </div>
            <div>
              <div className="sidebar-logo-text">SLDS</div>
              <div className="sidebar-logo-sub">Rwanda · 2026</div>
            </div>
          </div>

          {/* Role badge */}
          <div className="sidebar-role-badge" style={{ 
            background: meta.bg, 
            borderColor: meta.dot + '33',
            marginBottom: '24px'
          }}>
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

          {/* Navigation section label */}
          <div className="nav-section-label" style={{ marginBottom: '12px' }}>{ROLE_SECTION[role] ?? 'Navigation'}</div>
        </div>

        {/* Scrollable navigation menu */}
        <div style={{ 
          flex: 1, 
          overflowY: 'auto', 
          overflowX: 'hidden',
          marginBottom: '16px'
        }}>
          <nav className="sidebar-nav">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
            </div>
          </nav>
        </div>

        {/* Bottom section removed: user and controls now live in the top header */}

        {/* Footer
        <div className="sidebar-footer" style={{ marginTop: '10px' }}>
          Sector-Level Development<br />
          Simulator v1.0<br />
        </div> */}
      </aside>

      {/* ── Main ── */}
      <div className="main-content">
        <div className="page-header">
          <div>
            <div className="page-title">{current?.label ?? 'Dashboard'}</div>
            {role === 'national_admin' && (
              <div className="page-subtitle">Ministry Operations on Full national visibility</div>
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
            <div className="header-actions" ref={menuRef}>
              <NotificationBell />
              <button className="header-theme-btn" onClick={toggleTheme} type="button">
                {theme === 'dark'
                  ? <><IconSun size={16} /><span>Light</span></>
                  : <><IconMoon size={16} /><span>Dark</span></>
                }
              </button>

              <button
                className="header-user-btn"
                type="button"
                onClick={() => setMenuOpen(open => !open)}
                aria-expanded={menuOpen}
              >
                <span className="header-user-icon" style={{ background: meta.accent }}>
                  {user.name?.charAt(0).toUpperCase() ?? 'A'}
                </span>
                <span className="header-user-label">
                  <strong>{user.name}</strong>
                  <span>{meta.label}</span>
                </span>
                <span className="header-user-chevron">▾</span>
              </button>

              {menuOpen && (
                <div className="header-user-menu" role="menu">
                  <button type="button" className="header-user-menu-item" onClick={goToSettings}>
                    Settings
                  </button>
                  <button type="button" className="header-user-menu-item" onClick={handleLogout}>
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="page-body">
          <LoginWarningBanner />
          <Outlet />
        </div>
      </div>
    </div>
  )
}