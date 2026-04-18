import { useNavigate } from 'react-router-dom'

const ROLES = [
  {
    to:       '/sector',
    icon:     '◎',
    title:    'Sector Planner',
    desc:     'Monitor one sector, check lag alerts, compare with neighbors, and export investment request reports.',
    for:      'Sector / Umurenge Officers',
  },
  {
    to:       '/district',
    icon:     '⊞',
    title:    'District Planner',
    desc:     'Rank all sectors in your district, compare investment options side by side, and view a sequencing timeline.',
    for:      'District Officers',
  },
  {
    to:       '/national',
    icon:     '◉',
    title:    'National Overview',
    desc:     'Monitor all 416 sectors, track regional disparities, and validate model performance.',
    for:      'MINALOC / RISA',
  },
  {
    to:       '/simulation',
    icon:     '⟳',
    title:    'Simulation',
    desc:     'Run what-if scenarios — test how adding roads, health posts, or schools changes poverty in any sector.',
    for:      'All users',
  },
]

export default function Home() {
  const navigate = useNavigate()

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 6 }}>
          Sector-Level Development Simulator
        </h1>
        <p style={{ color: 'var(--gray-500)', lineHeight: 1.6, maxWidth: 560 }}>
          An evidence-based decision support tool for rural infrastructure planning in Rwanda.
          Select your role below to go directly to your dashboard.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {ROLES.map(r => (
          <button
            key={r.to}
            onClick={() => navigate(r.to)}
            style={{
              background:   'var(--white)',
              border:       '1px solid var(--gray-200)',
              borderRadius: 'var(--radius)',
              padding:      '20px 22px',
              textAlign:    'left',
              cursor:       'pointer',
              transition:   'border-color .12s, box-shadow .12s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--gray-400)'
              e.currentTarget.style.boxShadow   = 'var(--shadow)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--gray-200)'
              e.currentTarget.style.boxShadow   = 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{
                width: 32, height: 32,
                background:   'var(--gray-100)',
                borderRadius: 6,
                display:      'flex',
                alignItems:   'center',
                justifyContent: 'center',
                fontSize:     18,
                flexShrink:   0,
              }}>{r.icon}</span>
              <span style={{ fontWeight: 600, fontSize: 14 }}>{r.title}</span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--gray-600)', lineHeight: 1.5, marginBottom: 10 }}>
              {r.desc}
            </p>
            <span style={{ fontSize: 11, color: 'var(--gray-400)', fontWeight: 500 }}>
              FOR: {r.for}
            </span>
          </button>
        ))}
      </div>

      <hr className="divider" style={{ marginTop: 32 }} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {[
          { n: '416',   l: 'Sectors monitored' },
          { n: '5',     l: 'Infrastructure types' },
          { n: 'ML',    l: 'Simulation engine' },
          { n: 'CDI',   l: 'Composite index' },
        ].map(({ n, l }) => (
          <div key={l} style={{
            background: 'var(--gray-50)',
            border:     '1px solid var(--gray-200)',
            borderRadius: 'var(--radius)',
            padding:    '14px 16px',
          }}>
            <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>{n}</div>
            <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>{l}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
