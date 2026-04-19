import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const STATS = [
  { value: '416',    label: 'Sectors Monitored',      icon: '◎', sub: 'Across all 5 provinces' },
  { value: '30',     label: 'Districts Covered',       icon: '⊞', sub: 'Full national coverage' },
  { value: '12.4M',  label: 'Citizens Served',         icon: '◉', sub: 'Estimated 2026 population' },
  { value: '87%',    label: 'Data Completeness',        icon: '▣', sub: 'Sector-level indicators' },
  { value: '5',      label: 'Decision Modules',         icon: '⟳', sub: 'Planning · Simulation · Mapping' },
  { value: '2026',   label: 'Baseline Year',            icon: '◈', sub: 'Rwanda Vision 2050 aligned' },
]

const FEATURES = [
  {
    icon: '◉',
    title: 'National Overview',
    desc: 'Monitor the Composite Development Index across all 416 sectors. Identify lagging areas and track equity gaps in real time.',
  },
  {
    icon: '⊞',
    title: 'District Planning',
    desc: 'Compare sectors within a district, sequence investment priorities using data-driven Gantt scheduling, and export reports.',
  },
  {
    icon: '◎',
    title: 'Sector Intelligence',
    desc: 'Drill into any sector — infrastructure gaps, poverty rates, nightlight intensity, and peer benchmarking against neighbors.',
  },
  {
    icon: '⟳',
    title: 'Policy Simulation',
    desc: 'Run what-if scenarios before committing resources. Simulate the CDI impact of road, health, or school investments.',
  },
]

export default function LandingPage() {
  const { login } = useAuth()
  const navigate   = useNavigate()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    // Simulate slight delay for UX realism
    await new Promise(r => setTimeout(r, 600))
    const result = login(username, password)
    setLoading(false)
    if (result.ok) {
      navigate('/', { replace: true })
    } else {
      setError(result.error)
    }
  }

  return (
    <div className="landing-root">

      {/* ── Top nav bar ── */}
      <header className="landing-nav">
        <div className="landing-nav-brand">
          <div className="landing-brand-mark">SL</div>
          <div>
            <div className="landing-brand-name">SLDS</div>
            <div className="landing-brand-sub">Sector-Level Development Simulator</div>
          </div>
        </div>
        <div className="landing-nav-right">
          <span className="landing-badge">MINALOC · RISA · University of Rwanda</span>
        </div>
      </header>

      {/* ── Hero ── */}
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

          {/* Right — login card */}
          <div className="landing-login-wrap">
            <div className="landing-login-card">
              <div className="login-card-header">
                <div className="login-card-icon">🔐</div>
                <div>
                  <div className="login-card-title">Secure Access</div>
                  <div className="login-card-sub">Authorized personnel only</div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="login-form">
                <div className="login-field">
                  <label htmlFor="username">Username</label>
                  <input
                    id="username"
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    autoComplete="username"
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
                  <div className="login-error">
                    <span>⚠</span> {error}
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
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats strip ── */}
      <section className="landing-stats">
        {STATS.map(s => (
          <div key={s.label} className="landing-stat-card">
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
            <div className="stat-sub">{s.sub}</div>
          </div>
        ))}
      </section>

      {/* ── Feature cards ── */}
      <section className="landing-features">
        <div className="landing-section-label">Platform Capabilities</div>
        <h2 className="landing-h2">Everything decision-makers need</h2>
        <div className="landing-feature-grid">
          {FEATURES.map(f => (
            <div key={f.title} className="landing-feature-card">
              <div className="feature-icon">{f.icon}</div>
              <div className="feature-title">{f.title}</div>
              <div className="feature-desc">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div>
            <div className="landing-footer-brand">SLDS — Sector-Level Development Simulator</div>
            <div className="landing-footer-sub">
              Built by University of Rwanda · In partnership with MINALOC & RISA · Rwanda 2026
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
