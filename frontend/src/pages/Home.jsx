import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useApi } from '../hooks/useApi'
import { useRole } from '../hooks/useRole'
import { useAuth, ROLE_META } from '../context/AuthContext'
import {
  getNationalSummary, getNationalSectors,
  getDistrictSummary, getDistrictSectors,
  getSector, getModelPerformance,
} from '../api/client'
import MetricCard from '../components/MetricCard'

// ── Shared helpers ────────────────────────────────────────────────────────────
function QuickCard({ icon, title, desc, to, accent }) {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate(to)}
      className="home-quick-card"
      style={{ '--card-accent': accent }}
    >
      <div className="home-quick-icon" style={{ background: accent + '18', color: accent }}>
        {icon}
      </div>
      <div className="home-quick-title">{title}</div>
      <div className="home-quick-desc">{desc}</div>
      <div className="home-quick-arrow" style={{ color: accent }}>→</div>
    </button>
  )
}

function SectionTitle({ children }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '.08em', color: 'var(--gray-400)', marginBottom: 10 }}>
      {children}
    </div>
  )
}

function AlertBanner({ type = 'info', children }) {
  const styles = {
    danger:  { bg: '#fef2f2', border: '#fecaca', color: '#7f1d1d', icon: '⚠' },
    warning: { bg: '#fffbeb', border: '#fde68a', color: '#78350f', icon: '⚡' },
    success: { bg: '#f0fdf4', border: '#bbf7d0', color: '#14532d', icon: '✓' },
    info:    { bg: 'var(--gray-50)', border: 'var(--gray-200)', color: 'var(--gray-700)', icon: 'ℹ' },
  }
  const s = styles[type]
  return (
    <div style={{
      background: s.bg, border: `1px solid ${s.border}`, color: s.color,
      borderRadius: 8, padding: '12px 16px', fontSize: 13,
      display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16,
    }}>
      <span style={{ flexShrink: 0, fontWeight: 700 }}>{s.icon}</span>
      <span>{children}</span>
    </div>
  )
}

// ── NATIONAL ADMIN HOME ───────────────────────────────────────────────────────
function NationalHome() {
  const { user }  = useAuth()
  const navigate  = useNavigate()
  const meta      = ROLE_META.national_admin

  const { data: summary, loading: l1 } = useApi(getNationalSummary)
  const { data: sectors, loading: l2 } = useApi(getNationalSectors)

  const bottom5 = sectors
    ? [...sectors].sort((a, b) => a.cdi - b.cdi).slice(0, 5)
    : []

  // District averages for equity snapshot
  const distMap = {}
  sectors?.forEach(r => {
    if (!r.adm2_en) return
    if (!distMap[r.adm2_en]) distMap[r.adm2_en] = []
    distMap[r.adm2_en].push(r.cdi)
  })
  const distAvg = Object.entries(distMap)
    .map(([name, vals]) => ({ name, cdi: +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) }))
    .sort((a, b) => a.cdi - b.cdi)
    .slice(0, 10)

  return (
    <div className="gap-16">
      {/* Welcome */}
      <div className="home-welcome-bar" style={{ borderLeftColor: meta.accent }}>
        <div>
          <div className="home-welcome-title">National Administration Dashboard</div>
          <div className="home-welcome-sub">
            Welcome back, <strong>{user?.name}</strong> · Full national visibility · {new Date().toLocaleDateString('en-RW', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>
      </div>

      {/* National KPIs */}
      {!l1 && summary && (
        <div className="metric-row">
          <MetricCard label="Total Sectors"   value={summary.total_sectors} />
          <MetricCard label="Districts"        value={summary.total_districts} />
          <MetricCard label="National Avg CDI" value={summary.national_avg_cdi?.toFixed(1)} delta="/ 100" />
          <MetricCard
            label="Lagging Sectors"
            value={summary.lagging_sectors}
            delta={summary.lagging_sectors > 0 ? 'need priority action' : 'None lagging'}
            deltaType={summary.lagging_sectors > 0 ? 'negative' : 'positive'}
          />
          <MetricCard
            label="Avg Poverty Rate"
            value={summary.avg_poverty_rate != null ? `${(summary.avg_poverty_rate * 100).toFixed(1)}%` : '—'}
          />
          <MetricCard label="Most Developed"  value={summary.most_developed} />
        </div>
      )}

      {/* Alerts */}
      {summary?.lagging_sectors > 0 && (
        <AlertBanner type="warning">
          <strong>{summary.lagging_sectors} sectors</strong> are currently more than 10 CDI points below their district average and require priority investment attention.
          <button onClick={() => navigate('/national')} style={{ marginLeft: 12, fontWeight: 600, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 13 }}>
            View on National Map →
          </button>
        </AlertBanner>
      )}

      {/* Charts + bottom 5 */}
      <div className="grid-2">
        {/* District equity mini-chart */}
        <div className="card">
          <div className="card-title">District Equity — 10 Lowest CDI Districts</div>
          {l2
            ? <div className="loading"><div className="spinner" />Loading…</div>
            : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={distAvg} layout="vertical" margin={{ left: 80, right: 30, top: 0, bottom: 0 }}>
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={76} />
                  <Tooltip formatter={v => [v.toFixed(1), 'Avg CDI']} contentStyle={{ fontSize: 11 }} />
                  <Bar dataKey="cdi" radius={2}>
                    {distAvg.map((d, i) => (
                      <Cell key={i} fill={d.cdi < 35 ? '#dc2626' : d.cdi < 55 ? '#ca8a04' : '#16a34a'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )
          }
        </div>

        {/* Bottom 5 sectors */}
        <div className="card">
          <div className="card-title">Most Underserved Sectors — Require Immediate Action</div>
          {l2
            ? <div className="loading"><div className="spinner" />Loading…</div>
            : (
              <div>
                {bottom5.map((s, i) => (
                  <div key={s.adm3_en} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 0', borderBottom: i < 4 ? '1px solid var(--gray-100)' : 'none',
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', background: '#fef2f2',
                      color: '#dc2626', fontWeight: 700, fontSize: 11,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>#{i + 1}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{s.adm3_en}</div>
                      <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>{s.adm2_en}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, color: '#dc2626', fontSize: 14 }}>{s.cdi?.toFixed(1)}</div>
                      <div style={{ fontSize: 10, color: 'var(--gray-400)' }}>CDI</div>
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => navigate('/national')}
                  className="btn btn-secondary"
                  style={{ marginTop: 12, width: '100%', justifyContent: 'center', fontSize: 12 }}
                >
                  View All Sectors on National Map →
                </button>
              </div>
            )
          }
        </div>
      </div>

      {/* Module quick access */}
      <div>
        <SectionTitle>Platform Modules</SectionTitle>
        <div className="home-quick-grid">
          <QuickCard icon="◉" title="National Overview" accent="#09090b"
            desc="Monitor all 416 sectors, district equity chart, model performance." to="/national" />
          <QuickCard icon="⊞" title="District Planner" accent="#2563eb"
            desc="Rank sectors in any district, compare two, build investment sequence." to="/district" />
          <QuickCard icon="◎" title="Sector Planner" accent="#00A550"
            desc="Deep-dive any sector: CDI gap, neighbors, radar profile, export report." to="/sector" />
          <QuickCard icon="⟳" title="Simulation" accent="#7c3aed"
            desc="Run what-if scenarios — roads, health, schools — predict CDI change." to="/simulation" />
        </div>
      </div>
    </div>
  )
}

// ── DISTRICT OFFICER HOME ─────────────────────────────────────────────────────
function DistrictHome() {
  const { user }  = useAuth()
  const navigate  = useNavigate()
  const meta      = ROLE_META.district_officer
  const district  = user?.district

  const { data: summary, loading: l1 } = useApi(
    () => district ? getDistrictSummary(district) : Promise.resolve(null), [district]
  )
  const { data: sectors, loading: l2 } = useApi(
    () => district ? getDistrictSectors(district) : Promise.resolve([]), [district]
  )

  const barData  = sectors ? [...sectors].sort((a, b) => a.cdi - b.cdi) : []
  const lagging  = sectors?.filter(s => s.is_lagging) ?? []
  const bottom3  = barData.slice(0, 3)

  return (
    <div className="gap-16">
      {/* Welcome */}
      <div className="home-welcome-bar" style={{ borderLeftColor: meta.accent }}>
        <div>
          <div className="home-welcome-title">{district} District Dashboard</div>
          <div className="home-welcome-sub">
            Welcome, <strong>{user?.name}</strong> · {user?.title} · Scoped to <strong>{district}</strong> district
          </div>
        </div>
        <button onClick={() => navigate('/district')} className="btn btn-primary" style={{ fontSize: 12 }}>
          Open District Planner →
        </button>
      </div>

      {/* District KPIs */}
      {!l1 && summary && (
        <div className="metric-row">
          <MetricCard label="Sectors in District" value={summary.n_sectors} />
          <MetricCard label="Avg CDI"              value={summary.avg_cdi?.toFixed(1)} delta="/ 100" />
          <MetricCard
            label="Lagging Sectors"
            value={summary.lagging_sectors}
            deltaType={summary.lagging_sectors > 0 ? 'negative' : 'positive'}
            delta={summary.lagging_sectors > 0 ? 'below avg by >10 pts' : 'All on track'}
          />
          <MetricCard label="Avg Poverty"   value={summary.avg_poverty != null ? `${(summary.avg_poverty * 100).toFixed(1)}%` : '—'} />
          <MetricCard label="Best Sector"   value={summary.best_sector} />
          <MetricCard label="Worst Sector"  value={summary.worst_sector} deltaType="negative" />
        </div>
      )}

      {/* Lag alerts */}
      {lagging.length > 0 && (
        <AlertBanner type="warning">
          <strong>{lagging.length} sector{lagging.length > 1 ? 's' : ''}</strong> in {district} are lagging more than 10 CDI points below the district average:&nbsp;
          <strong>{lagging.map(s => s.adm3_en).join(', ')}</strong>. Submit investment requests to MINALOC.
        </AlertBanner>
      )}

      <div className="grid-2">
        {/* CDI bar */}
        <div className="card">
          <div className="card-title">Sector CDI Ranking — {district}</div>
          {l2
            ? <div className="loading"><div className="spinner" />Loading…</div>
            : (
              <ResponsiveContainer width="100%" height={Math.max(200, barData.length * 24)}>
                <BarChart data={barData} layout="vertical" margin={{ left: 100, right: 40, top: 0, bottom: 0 }}>
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="adm3_en" tick={{ fontSize: 10 }} width={96} />
                  <Tooltip formatter={v => [v.toFixed(1), 'CDI']} contentStyle={{ fontSize: 11 }} />
                  <Bar dataKey="cdi" radius={2}>
                    {barData.map((d, i) => (
                      <Cell key={i} fill={d.cdi < 35 ? '#dc2626' : d.cdi < 55 ? '#ca8a04' : d.cdi < 75 ? '#16a34a' : '#09090b'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )
          }
        </div>

        {/* Priority action list */}
        <div className="card">
          <div className="card-title">Priority Investment Sectors</div>
          {l2
            ? <div className="loading"><div className="spinner" />Loading…</div>
            : (
              <div>
                {bottom3.map((s, i) => (
                  <div key={s.adm3_en} style={{
                    padding: '12px 0', borderBottom: i < 2 ? '1px solid var(--gray-100)' : 'none',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div>
                        <span style={{ fontWeight: 700, fontSize: 13 }}>#{i + 1}  {s.adm3_en}</span>
                        {s.is_lagging && (
                          <span style={{
                            marginLeft: 8, fontSize: 10, fontWeight: 600,
                            background: '#fef2f2', color: '#dc2626',
                            border: '1px solid #fecaca', borderRadius: 4, padding: '1px 6px',
                          }}>LAGGING</span>
                        )}
                      </div>
                      <span style={{ fontWeight: 700, color: '#dc2626' }}>CDI {s.cdi?.toFixed(1)}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--gray-500)' }}>
                      <span>Roads: {s.road_density_km_per_km2?.toFixed(2) ?? '—'}</span>
                      <span>Health: {s.health_facility_count ?? '—'}</span>
                      <span>Schools: {s.school_count ?? '—'}</span>
                      <span>Poverty: {s.predicted_poverty_rate != null ? `${(s.predicted_poverty_rate * 100).toFixed(0)}%` : '—'}</span>
                    </div>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                  <button onClick={() => navigate('/district')} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', fontSize: 12 }}>
                    Full District Planner →
                  </button>
                  <button onClick={() => navigate('/simulation')} className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center', fontSize: 12 }}>
                    Run Simulation →
                  </button>
                </div>
              </div>
            )
          }
        </div>
      </div>

      {/* Quick access */}
      <div>
        <SectionTitle>Your Tools</SectionTitle>
        <div className="home-quick-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <QuickCard icon="⊞" title="District Planner" accent={meta.accent}
            desc={`Rank sectors in ${district}, compare side-by-side, and build investment sequence.`} to="/district" />
          <QuickCard icon="⟳" title="Policy Simulation" accent="#7c3aed"
            desc="Run what-if scenarios to predict CDI impact of proposed investments." to="/simulation" />
        </div>
      </div>
    </div>
  )
}

// ── SECTOR OFFICER HOME ───────────────────────────────────────────────────────
function SectorHome() {
  const { user }  = useAuth()
  const navigate  = useNavigate()
  const meta      = ROLE_META.sector_officer
  const { sector, district } = user ?? {}

  const { data: sectorData, loading: l1 } = useApi(
    () => sector ? getSector(sector) : Promise.resolve(null), [sector]
  )
  const { data: distSectors, loading: l2 } = useApi(
    () => district ? getDistrictSectors(district) : Promise.resolve([]), [district]
  )

  const gap     = sectorData?.gap_from_district ?? 0
  const distAvg = sectorData?.district_avg_cdi ?? 0

  const FEAT = {
    predicted_poverty_rate:  'Poverty Rate',
    road_density_km_per_km2: 'Road Density',
    health_facility_count:   'Health Posts',
    school_count:            'Schools',
    nightlight_mean:         'Night Light',
  }

  const gapData = Object.keys(FEAT).filter(k => sectorData?.[k] != null).map(k => {
    const sVal = sectorData[k]
    const dAvg = distSectors?.length
      ? distSectors.reduce((s, r) => s + (r[k] ?? 0), 0) / distSectors.length
      : 0
    return { name: FEAT[k], value: +(sVal - dAvg).toFixed(3) }
  })

  // CSV export content
  const csvContent = sectorData ? [
    'Field,Value',
    `Sector,${sector}`,
    `District,${district}`,
    `CDI Score,${sectorData.cdi?.toFixed(1)}`,
    `National Rank,#${sectorData.cdi_national_rank}`,
    `District Rank,#${sectorData.cdi_district_rank}`,
    `Tier,${sectorData.tier}`,
    `Poverty Rate,${sectorData.predicted_poverty_rate != null ? `${(sectorData.predicted_poverty_rate * 100).toFixed(1)}%` : ''}`,
    `Road Density,${sectorData.road_density_km_per_km2?.toFixed(3)}`,
    `Health Posts,${sectorData.health_facility_count}`,
    `Schools,${sectorData.school_count}`,
    `Gap vs District,${gap.toFixed(1)} points`,
    `Lag Alert,${gap < -10 ? 'YES - Priority Investment Required' : 'No'}`,
  ].join('\n') : ''

  return (
    <div className="gap-16">
      {/* Welcome */}
      <div className="home-welcome-bar" style={{ borderLeftColor: meta.accent }}>
        <div>
          <div className="home-welcome-title">{sector} Sector Dashboard</div>
          <div className="home-welcome-sub">
            Welcome, <strong>{user?.name}</strong> · {user?.title} · {district} District
          </div>
        </div>
        {sectorData && (
          <a
            href={`data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`}
            download={`investment_request_${sector?.replace(/\s+/g, '_')}.csv`}
            className="btn btn-primary"
            style={{ fontSize: 12, textDecoration: 'none' }}
          >
            ↓ Export Investment Request
          </a>
        )}
      </div>

      {/* Lag alert — the most critical element for a sector officer */}
      {l1
        ? <div className="loading"><div className="spinner" />Loading sector data…</div>
        : sectorData && (
          gap < -10
            ? <AlertBanner type="danger">
                ⚠ LAG ALERT — <strong>{sector}</strong> is <strong>{Math.abs(gap).toFixed(1)} CDI points</strong> below the {district} district average ({distAvg.toFixed(1)}).
                Submit an investment request to the District Office immediately.
              </AlertBanner>
            : gap < 0
              ? <AlertBanner type="warning">
                  {sector} is {Math.abs(gap).toFixed(1)} points below district average. Monitor closely and consider submitting a request next quarter.
                </AlertBanner>
              : <AlertBanner type="success">
                  {sector} is {gap.toFixed(1)} points above the district average. Keep monitoring to maintain this standing.
                </AlertBanner>
        )
      }

      {/* KPI Cards */}
      {sectorData && !l1 && (
        <div className="metric-row">
          <MetricCard
            label="CDI Score"
            value={sectorData.cdi?.toFixed(1)}
            delta={`${gap > 0 ? '+' : ''}${gap.toFixed(1)} vs district avg`}
            deltaType={gap >= 0 ? 'positive' : 'negative'}
          />
          <MetricCard label="National Rank" value={`#${sectorData.cdi_national_rank}`} />
          <MetricCard label="District Rank" value={`#${sectorData.cdi_district_rank}`} />
          <MetricCard
            label="Poverty Rate"
            value={sectorData.predicted_poverty_rate != null
              ? `${(sectorData.predicted_poverty_rate * 100).toFixed(1)}%` : '—'}
          />
          <MetricCard label="Health Posts"  value={sectorData.health_facility_count ?? '—'} />
          <MetricCard label="Road Density"  value={`${(sectorData.road_density_km_per_km2 ?? 0).toFixed(2)}`} delta="km/km²" />
        </div>
      )}

      <div className="grid-2">
        {/* Infrastructure gap chart */}
        <div className="card">
          <div className="card-title">Infrastructure Gap vs District Average</div>
          {(l1 || l2)
            ? <div className="loading"><div className="spinner" />Loading…</div>
            : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={gapData} layout="horizontal" margin={{ left: 4, right: 20, top: 4, bottom: 4 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      formatter={(v) => [`${v > 0 ? '+' : ''}${v.toFixed(3)}`, 'Gap vs district avg']}
                      contentStyle={{ fontSize: 11 }}
                    />
                    <Bar dataKey="value" radius={3}>
                      {gapData.map((d, i) => (
                        <Cell key={i} fill={d.value < 0 ? '#dc2626' : '#00A550'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 6 }}>
                  Red = below district average (investment needed) · Green = above average
                </div>
              </>
            )
          }
        </div>

        {/* Tier info + actions */}
        <div className="card">
          <div className="card-title">Development Status</div>
          {sectorData && (
            <>
              <div style={{ textAlign: 'center', padding: '16px 0 20px' }}>
                <div style={{ fontSize: 11, color: 'var(--gray-400)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.06em' }}>Current Tier</div>
                <div className={`tier-badge tier-${sectorData.tier}`} style={{ fontSize: 18, padding: '8px 20px' }}>
                  {sectorData.tier}
                </div>
                <div style={{ marginTop: 12, fontSize: 12, color: 'var(--gray-500)' }}>
                  District average CDI: <strong>{distAvg.toFixed(1)}</strong>
                </div>
                <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>
                  Your CDI: <strong style={{ color: gap < -10 ? '#dc2626' : gap < 0 ? '#ca8a04' : '#16a34a' }}>
                    {sectorData.cdi?.toFixed(1)}
                  </strong>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button onClick={() => navigate('/sector')} className="btn btn-primary" style={{ justifyContent: 'center', fontSize: 12 }}>
                  Full Sector Analysis →
                </button>
                <button onClick={() => navigate('/simulation')} className="btn btn-secondary" style={{ justifyContent: 'center', fontSize: 12 }}>
                  Simulate Investment Impact →
                </button>
                <button onClick={() => navigate('/district')} className="btn btn-secondary" style={{ justifyContent: 'center', fontSize: 12 }}>
                  View in District Context →
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── ANALYST HOME ──────────────────────────────────────────────────────────────
function AnalystHome() {
  const { user }  = useAuth()
  const navigate  = useNavigate()
  const meta      = ROLE_META.analyst

  const { data: summary, loading: l1 } = useApi(getNationalSummary)
  const { data: perf,    loading: l2 } = useApi(getModelPerformance)

  return (
    <div className="gap-16">
      {/* Welcome */}
      <div className="home-welcome-bar" style={{ borderLeftColor: meta.accent }}>
        <div>
          <div className="home-welcome-title">Policy Analysis & Research Dashboard</div>
          <div className="home-welcome-sub">
            Welcome, <strong>{user?.name}</strong> · {user?.title} · Full read access · Simulation enabled
          </div>
        </div>
        <button onClick={() => navigate('/simulation')} className="btn btn-primary" style={{ fontSize: 12, background: meta.accent, borderColor: meta.accent }}>
          Launch Simulation →
        </button>
      </div>

      {/* National context stats */}
      {!l1 && summary && (
        <div className="metric-row">
          <MetricCard label="Sectors in Dataset"  value={summary.total_sectors} />
          <MetricCard label="Districts"             value={summary.total_districts} />
          <MetricCard label="National Avg CDI"      value={summary.national_avg_cdi?.toFixed(1)} delta="/ 100" />
          <MetricCard label="Lagging Sectors"       value={summary.lagging_sectors} deltaType={summary.lagging_sectors > 0 ? 'negative' : 'positive'} />
          <MetricCard label="Avg Poverty Rate"      value={summary.avg_poverty_rate != null ? `${(summary.avg_poverty_rate * 100).toFixed(1)}%` : '—'} />
          <MetricCard label="Least Developed"       value={summary.least_developed} deltaType="negative" />
        </div>
      )}

      <div className="grid-2">
        {/* Model performance */}
        <div className="card">
          <div className="card-title">Predictive Model Performance</div>
          {l2
            ? <div className="loading"><div className="spinner" />Loading…</div>
            : !perf || perf.trained === false
              ? <AlertBanner type="info">Model not yet trained. Run Notebook 03 to generate predictions.</AlertBanner>
              : (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                    {[
                      { l: 'R² Score',     v: perf.r2?.toFixed(3),  note: '1.0 = perfect' },
                      { l: 'MAE',          v: perf.mae?.toFixed(4), note: 'lower is better' },
                      { l: 'Training Rows', v: perf.n_samples,       note: 'samples' },
                      { l: 'Features',     v: perf.n_features,      note: 'predictors' },
                    ].map(({ l, v, note }) => (
                      <div key={l} style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: 6, padding: '12px 14px' }}>
                        <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--gray-500)', marginBottom: 4 }}>{l}</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--black)' }}>{v ?? '—'}</div>
                        <div style={{ fontSize: 10, color: 'var(--gray-400)', marginTop: 2 }}>{note}</div>
                      </div>
                    ))}
                  </div>
                  {perf.importances && (
                    <>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-600)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.06em' }}>Feature Importance</div>
                      {Object.entries(perf.importances)
                        .sort(([, a], [, b]) => b - a)
                        .map(([k, v]) => (
                          <div key={k} style={{ marginBottom: 6 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
                              <span style={{ color: 'var(--gray-600)' }}>{k.replace(/_/g, ' ')}</span>
                              <span style={{ fontWeight: 600 }}>{(v * 100).toFixed(1)}%</span>
                            </div>
                            <div style={{ height: 4, background: 'var(--gray-100)', borderRadius: 2 }}>
                              <div style={{ height: '100%', width: `${v * 100}%`, background: meta.accent, borderRadius: 2 }} />
                            </div>
                          </div>
                        ))
                      }
                    </>
                  )}
                </div>
              )
          }
        </div>

        {/* Simulation launcher */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-title">Simulation Engine</div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 0' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: meta.bg, border: `2px solid ${meta.dot}33`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, marginBottom: 16,
            }}>⟳</div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>What-If Scenario Builder</div>
            <div style={{ fontSize: 13, color: 'var(--gray-500)', textAlign: 'center', maxWidth: 280, lineHeight: 1.6, marginBottom: 20 }}>
              Select any sector, adjust infrastructure sliders, and predict the resulting CDI change before committing resources.
            </div>
            <button
              onClick={() => navigate('/simulation')}
              className="btn btn-primary"
              style={{ background: meta.accent, borderColor: meta.accent, fontSize: 13 }}
            >
              Open Simulation →
            </button>
          </div>

          <div style={{ borderTop: '1px solid var(--gray-100)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { icon: '◉', label: 'National Overview', to: '/national' },
              { icon: '⊞', label: 'District Planner',  to: '/district' },
              { icon: '◎', label: 'Sector Planner',    to: '/sector' },
            ].map(({ icon, label, to }) => (
              <button
                key={to}
                onClick={() => navigate(to)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                  background: 'var(--gray-50)', border: '1px solid var(--gray-200)',
                  borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 500,
                  color: 'var(--gray-700)', width: '100%',
                }}
              >
                <span>{icon}</span> {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── ROOT ROUTER ───────────────────────────────────────────────────────────────
export default function Home() {
  const { role } = useRole()

  if (role === 'national_admin')   return <NationalHome />
  if (role === 'district_officer') return <DistrictHome />
  if (role === 'sector_officer')   return <SectorHome />
  if (role === 'analyst')          return <AnalystHome />
  return <NationalHome />
}
