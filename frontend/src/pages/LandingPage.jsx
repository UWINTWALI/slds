import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, DEMO_USERS, ROLE_META } from '../context/AuthContext'
import { getDistricts, getSectorList } from '../api/client'
import {
  IconGlobe, IconMap, IconMapPin, IconFlask, IconUsers, IconSliders, IconBarChart,
  IconTarget, IconLock, IconUserPlus, IconShield, IconAlertTriangle, IconCheckCircle,
} from '../components/Icons'

/* ── Stats strip data ─────────────────────────────────────────────────────────── */
const STATS = [
  { value: '416',   label: 'Sectors Monitored',  Icon: IconMapPin,  sub: 'Across all 5 provinces'          },
  { value: '30',    label: 'Districts Covered',    Icon: IconMap,     sub: 'Full national coverage'          },
  { value: '12.4M', label: 'Citizens Served',      Icon: IconUsers,   sub: 'Estimated 2026 population'       },
  { value: '87%',   label: 'Data Completeness',    Icon: IconBarChart,sub: 'Sector-level indicators'         },
  { value: '5',     label: 'Decision Modules',     Icon: IconSliders, sub: 'Planning · Simulation · Mapping' },
  { value: '2026',  label: 'Baseline Year',         Icon: IconTarget,  sub: 'Rwanda Vision 2050 aligned'     },
]

/* ── Feature cards data ────────────────────────────────────────────────────────── */
const FEATURES = [
  {
    Icon: IconGlobe,
    title: 'National Overview',
    desc: 'Monitor the Composite Development Index across all 416 sectors. Identify lagging areas and track equity gaps in real time.',
  },
  {
    Icon: IconMap,
    title: 'District Planning',
    desc: 'Compare sectors within a district, sequence investment priorities using data-driven Gantt scheduling, and export reports.',
  },
  {
    Icon: IconMapPin,
    title: 'Sector Intelligence',
    desc: 'Drill into any sector — infrastructure gaps, poverty rates, nightlight intensity, and peer benchmarking against neighbors.',
  },
  {
    Icon: IconFlask,
    title: 'Policy Simulation',
    desc: 'Run what-if scenarios before committing resources. Simulate the CDI impact of road, health, or school investments.',
  },
]

const REGISTERABLE_ROLES = [
  { value: 'district_officer', label: 'District Officer' },
  { value: 'sector_officer',   label: 'Sector Officer'   },
  { value: 'analyst',          label: 'Policy Analyst'   },
]

/* ── Login form ────────────────────────────────────────────────────────────────── */
function LoginForm({ onSwitch }) {
  const { login }  = useAuth()
  const navigate   = useNavigate()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = await login(email, password)
    setLoading(false)
    if (result.ok) {
      navigate('/', { replace: true })
    } else {
      setError(result.error)
    }
  }

  return (
    <>
      <div className="login-card-header">
        <div className="login-card-icon">
          <IconLock size={22} color="var(--rw-green)" />
        </div>
        <div>
          <div className="login-card-title">Sign In</div>
          <div className="login-card-sub">Authorized personnel only</div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="login-form">
        <div className="login-field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            placeholder="your@email.rw"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>

        <div className="login-field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>

        {error && (
          <div className="login-error" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <IconAlertTriangle size={14} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <button type="submit" className="login-btn" disabled={loading}>
          {loading
            ? <><span className="login-spinner" /> Verifying…</>
            : 'Sign In to Dashboard →'
          }
        </button>
      </form>

      <div className="login-footer">
        <p>Access is restricted to government staff and authorised researchers.</p>
        <p style={{ marginTop: 6 }}>
          Issues? Contact{' '}
          <a href="mailto:support@risa.rw" style={{ color: 'var(--rw-green)', textDecoration: 'underline' }}>
            support@risa.rw
          </a>
        </p>
      </div>

      <div style={{ marginTop: 14, textAlign: 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>
          No account?{' '}
          <button type="button" onClick={onSwitch}
            style={{ background: 'none', border: 'none', color: 'var(--rw-green)', fontWeight: 700, cursor: 'pointer', fontSize: 12, padding: 0 }}>
            Create one here
          </button>
        </span>
      </div>

      {/* Demo credentials */}
      <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--gray-100)' }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--gray-400)', marginBottom: 8 }}>
          Demo Credentials
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {DEMO_USERS.map(u => {
            const m = ROLE_META[u.role]
            return (
              <button
                key={u.username}
                type="button"
                onClick={() => { setEmail(u.email); setPassword(u.password) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 10px', borderRadius: 6, border: `1px solid ${m.dot}30`,
                  background: m.bg, cursor: 'pointer', textAlign: 'left', width: '100%',
                }}
              >
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: m.dot, flexShrink: 0 }} />
                <span style={{ fontWeight: 700, fontSize: 11, color: m.color, minWidth: 90 }}>{u.email}</span>
                <span style={{ fontSize: 10, color: 'var(--gray-500)', flex: 1 }}>
                  {m.label}{u.district ? ` · ${u.district}` : ''}{u.sector ? ` / ${u.sector}` : ''}
                </span>
                <span style={{ fontSize: 10, color: 'var(--gray-400)', fontStyle: 'italic' }}>{u.password}</span>
              </button>
            )
          })}
        </div>
        <div style={{ fontSize: 10, color: 'var(--gray-400)', marginTop: 6 }}>Click any row to auto-fill credentials</div>
      </div>
    </>
  )
}

/* ── Register form ─────────────────────────────────────────────────────────────── */
function RegisterForm({ onSwitch }) {
  const { register } = useAuth()
  const navigate     = useNavigate()

  const [fullName,  setFullName]  = useState('')
  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [role,      setRole]      = useState('district_officer')
  const [district,  setDistrict]  = useState('')
  const [sector,    setSector]    = useState('')
  const [error,     setError]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [success,   setSuccess]   = useState(false)

  const [districts, setDistricts] = useState([])
  const [sectors,   setSectors]   = useState([])

  useEffect(() => {
    getDistricts().then(setDistricts).catch(() => {})
  }, [])

  useEffect(() => {
    setSector('')
    if (role === 'sector_officer' && district) {
      getSectorList(district).then(setSectors).catch(() => setSectors([]))
    } else {
      setSectors([])
    }
  }, [role, district])

  const needsDistrict = role === 'district_officer' || role === 'sector_officer'
  const needsSector   = role === 'sector_officer'

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password !== confirm)          { setError('Passwords do not match.'); return }
    if (password.length < 6)           { setError('Password must be at least 6 characters.'); return }
    if (needsDistrict && !district)    { setError('Please select a district.'); return }
    if (needsSector   && !sector)      { setError('Please select a sector.'); return }

    setLoading(true)
    const result = await register({
      full_name: fullName,
      email,
      password,
      role,
      district: needsDistrict ? district : null,
      sector:   needsSector   ? sector   : null,
    })
    setLoading(false)

    if (result.ok) {
      setSuccess(true)
    } else {
      setError(result.error)
    }
  }

  if (success) {
    return (
      <div style={{ textAlign: 'center', padding: '24px 0' }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: '#f0fdf4', border: '1px solid #bbf7d0',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 14px',
        }}>
          <IconCheckCircle size={26} color="#16a34a" />
        </div>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Account created!</div>
        <div style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 20 }}>
          You can now sign in with your email and password.
        </div>
        <button className="login-btn" onClick={onSwitch}>Sign In →</button>
      </div>
    )
  }

  return (
    <>
      <div className="login-card-header">
        <div className="login-card-icon">
          <IconUserPlus size={22} color="var(--rw-green)" />
        </div>
        <div>
          <div className="login-card-title">Create Account</div>
          <div className="login-card-sub">Government staff &amp; researchers</div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="login-form">
        <div className="login-field">
          <label htmlFor="reg-name">Full Name</label>
          <input id="reg-name" type="text" placeholder="Your full name"
            value={fullName} onChange={e => setFullName(e.target.value)} required />
        </div>

        <div className="login-field">
          <label htmlFor="reg-email">Email</label>
          <input id="reg-email" type="email" placeholder="your@email.rw"
            value={email} onChange={e => setEmail(e.target.value)}
            autoComplete="email" required />
        </div>

        <div className="login-field">
          <label htmlFor="reg-role">Role</label>
          <select id="reg-role" value={role} onChange={e => { setRole(e.target.value); setDistrict(''); setSector('') }}>
            {REGISTERABLE_ROLES.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        {needsDistrict && (
          <div className="login-field">
            <label htmlFor="reg-district">District</label>
            <select id="reg-district" value={district} onChange={e => setDistrict(e.target.value)} required>
              <option value="">— Select district —</option>
              {districts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        )}

        {needsSector && district && (
          <div className="login-field">
            <label htmlFor="reg-sector">Sector</label>
            <select id="reg-sector" value={sector} onChange={e => setSector(e.target.value)} required>
              <option value="">— Select sector —</option>
              {sectors.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}

        <div className="login-field">
          <label htmlFor="reg-password">Password</label>
          <input id="reg-password" type="password" placeholder="Min 6 characters"
            value={password} onChange={e => setPassword(e.target.value)}
            autoComplete="new-password" required />
        </div>

        <div className="login-field">
          <label htmlFor="reg-confirm">Confirm Password</label>
          <input id="reg-confirm" type="password" placeholder="Repeat password"
            value={confirm} onChange={e => setConfirm(e.target.value)}
            autoComplete="new-password" required />
        </div>

        {error && (
          <div className="login-error" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <IconAlertTriangle size={14} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <button type="submit" className="login-btn" disabled={loading}>
          {loading
            ? <><span className="login-spinner" /> Creating account…</>
            : 'Create Account →'
          }
        </button>
      </form>

      <div style={{ marginTop: 14, textAlign: 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>
          Already have an account?{' '}
          <button type="button" onClick={onSwitch}
            style={{ background: 'none', border: 'none', color: 'var(--rw-green)', fontWeight: 700, cursor: 'pointer', fontSize: 12, padding: 0 }}>
            Sign in
          </button>
        </span>
      </div>
    </>
  )
}

/* ── Main landing page ─────────────────────────────────────────────────────────── */
export default function LandingPage() {
  const [mode, setMode] = useState('login')  // 'login' | 'register'

  return (
    <div className="landing-root">

      {/* Top nav bar */}
      <header className="landing-nav">
        <div className="landing-nav-brand">
          <div className="landing-brand-mark">SL</div>
          <div>
            <div className="landing-brand-name">SLDS</div>
            <div className="landing-brand-sub">Sector-Level Development Simulator</div>
          </div>
        </div>
        <div className="landing-nav-right">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <IconShield size={13} color="rgba(255,255,255,0.6)" />
            <span className="landing-badge">Gov platform</span>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="landing-hero">
        <div className="landing-hero-inner">

          {/* Left — copy */}
          <div className="landing-hero-copy">
            <div className="landing-eyebrow">Rwanda Vision 2050 · Decision Support</div>
            <h1 className="landing-h1">
              Data-Driven Governance<br />
              <span className="landing-h1-accent">at Sector Scale</span>
            </h1>
            <p className="landing-lead">
              SLDS gives MINALOC planners, district officers, and sector administrators
              a single platform to monitor development indicators, identify equity gaps,
              and simulate the impact of infrastructure investments — all 416 sectors, in real time.
            </p>

            {/* Stat pills */}
            <div className="landing-pills">
              <div className="landing-pill"><strong>416</strong> Sectors</div>
              <div className="landing-pill"><strong>30</strong> Districts</div>
              <div className="landing-pill"><strong>5</strong> Provinces</div>
              <div className="landing-pill"><strong>CDI</strong> Composite Index</div>
            </div>
          </div>

          {/* Right — auth card */}
          <div className="landing-login-wrap">
            <div className="landing-login-card">
              {/* Tab toggle */}
              <div style={{
                display: 'flex', borderBottom: '1px solid var(--gray-100)',
                marginBottom: 20, gap: 0,
              }}>
                {[
                  { key: 'login',    label: 'Sign In'  },
                  { key: 'register', label: 'Register' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setMode(key)}
                    style={{
                      flex: 1, padding: '10px 0', border: 'none', background: 'none',
                      cursor: 'pointer', fontSize: 13, fontWeight: mode === key ? 700 : 400,
                      color: mode === key ? 'var(--black)' : 'var(--gray-400)',
                      borderBottom: mode === key ? '2px solid var(--rw-green)' : '2px solid transparent',
                      marginBottom: -1,
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {mode === 'login'
                ? <LoginForm    onSwitch={() => setMode('register')} />
                : <RegisterForm onSwitch={() => setMode('login')} />
              }
            </div>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="landing-stats">
        {STATS.map(s => (
          <div key={s.label} className="landing-stat-card">
            <div className="stat-icon">
              <s.Icon size={20} color="var(--rw-green)" />
            </div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
            <div className="stat-sub">{s.sub}</div>
          </div>
        ))}
      </section>

      {/* Feature cards */}
      <section className="landing-features">
        <div className="landing-section-label">Platform Capabilities</div>
        <h2 className="landing-h2">Everything decision-makers need</h2>
        <div className="landing-feature-grid">
          {FEATURES.map(f => (
            <div key={f.title} className="landing-feature-card">
              <div className="feature-icon">
                <f.Icon size={22} color="var(--rw-green)" />
              </div>
              <div className="feature-title">{f.title}</div>
              <div className="feature-desc">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div>
            <div className="landing-footer-brand">Sector-Level Development Simulator</div>
            <div className="landing-footer-sub">
              Gov platform· Rwanda 2026
            </div>
          </div>
          <div className="landing-footer-badges">
            <span className="footer-badge">Rwanda Vision 2050</span>
            <span className="footer-badge">NST1 Aligned</span>
            <span className="footer-badge">Open Data</span>
          </div>
        </div>
      </footer>

    </div>
  )
}
