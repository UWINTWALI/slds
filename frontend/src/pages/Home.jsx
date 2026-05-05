/**
 * Home.jsx — Role-specific dashboards.
 * Each role sees a completely different layout tailored to their responsibilities.
 *
 *  national_admin  → Ministry Operations Center (country-wide command panel)
 *  district_officer → District Operations Center (scoped to their district)
 *  sector_officer   → Sector Monitoring Panel (infra status + poverty)
 *  analyst          → Research & Analysis Center
 */
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis } from 'recharts'
import { useApi } from '../hooks/useApi'
import { useRole } from '../hooks/useRole'
import { useAuth, ROLE_META } from '../context/AuthContext'
import {
  getNationalSummary, getNationalSectors,
  getDistrictSummary, getDistrictSectors,
  getSector, getModelPerformance,
} from '../api/client'
import MetricCard from '../components/MetricCard'
import { generateMinistryPublication } from '../utils/reportUtils'
import {
  IconGlobe, IconMap, IconMapPin, IconFlask, IconUsers,
  IconAlertTriangle, IconCheckCircle, IconInfo,
  IconBarChart, IconTrendingDown, IconTrendingUp,
  IconSliders, IconFileText, IconShare,
  IconActivity, IconZap, IconBookOpen, IconRoad, IconBuilding,
  IconCpu, IconFolder,
} from '../components/Icons'

/* ── Shared helpers ─────────────────────────────────────────────────────────── */

function Stat({ label, value, sub, color }) {
  return (
    <div className="dash-stat">
      <div className="dash-stat-value" style={{ color: color ?? 'var(--black)' }}>{value}</div>
      <div className="dash-stat-label">{label}</div>
      {sub && <div className="dash-stat-sub">{sub}</div>}
    </div>
  )
}

function DashCard({ children, title, action, actionLabel, Icon }) {
  const navigate = useNavigate()
  return (
    <div className="dash-card">
      <div className="dash-card-header">
        <div className="dash-card-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          {Icon && <Icon size={14} color="var(--gray-400)" />}
          {title}
        </div>
        {action && (
          <button className="dash-card-action" onClick={() => navigate(action)}>
            {actionLabel ?? 'View all →'}
          </button>
        )}
      </div>
      <div className="dash-card-body">{children}</div>
    </div>
  )
}

function AlertBar({ type = 'warning', children }) {
  const config = {
    danger:  { bg: '#fef2f2', border: '#fecaca', color: '#7f1d1d', Icon: IconAlertTriangle },
    warning: { bg: '#fffbeb', border: '#fde68a', color: '#78350f', Icon: IconAlertTriangle },
    success: { bg: '#f0fdf4', border: '#bbf7d0', color: '#14532d', Icon: IconCheckCircle  },
    info:    { bg: 'var(--gray-50)', border: 'var(--gray-200)', color: 'var(--gray-700)', Icon: IconInfo },
  }
  const { Icon, ...s } = config[type]
  return (
    <div style={{
      background: s.bg, border: `1px solid ${s.border}`, color: s.color,
      borderRadius: 8, padding: '11px 16px', fontSize: 13,
      display: 'flex', alignItems: 'flex-start', gap: 10,
    }}>
      <Icon size={15} style={{ marginTop: 1, flexShrink: 0 }} />
      <span>{children}</span>
    </div>
  )
}

function ActionButton({ label, to, Icon, accent }) {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate(to)}
      className="dash-action-btn"
      style={{ '--btn-accent': accent }}
    >
      {Icon && <Icon size={15} />}
      <span>{label}</span>
    </button>
  )
}

/* ═══════════════════════════════════════════════════════════════
   MINISTRY OFFICER DASHBOARD (national_admin)
   Command center: country overview, underserved sectors, actions
═══════════════════════════════════════════════════════════════ */
function MinistryHome() {
  const { user }   = useAuth()
  const navigate   = useNavigate()
  const meta       = ROLE_META.national_admin

  const { data: summary, loading: l1 } = useApi(getNationalSummary)
  const { data: sectors, loading: l2 } = useApi(getNationalSectors)

  const laggingList = sectors
    ? [...sectors].filter(s => s.cdi < 40).sort((a, b) => a.cdi - b.cdi).slice(0, 8)
    : []

  const distMap = {}
  sectors?.forEach(r => {
    if (!r.adm2_en) return
    if (!distMap[r.adm2_en]) distMap[r.adm2_en] = []
    distMap[r.adm2_en].push(r.cdi)
  })
  const distAvg = Object.entries(distMap)
    .map(([name, vals]) => ({ name, cdi: +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) }))
    .sort((a, b) => a.cdi - b.cdi)
    .slice(0, 12)

  return (
    <div className="gap-16">
      {/* Command header */}
      <div className="dash-command-header" style={{ borderLeftColor: meta.accent }}>
        <div className="dash-command-left">
          <div className="dash-command-title">Ministry Operations Center</div>
          <div className="dash-command-sub">
            Welcome, <strong>{user?.name}</strong> &nbsp;·&nbsp; MINALOC / RISA &nbsp;·&nbsp;
            {new Date().toLocaleDateString('en-RW', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
        <div className="dash-command-actions">
          <button onClick={() => navigate('/national')} className="btn btn-primary"
            style={{ background: meta.accent, borderColor: meta.accent, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <IconGlobe size={14} /> Open National Map
          </button>
          <button onClick={() => navigate('/simulation')} className="btn btn-secondary"
            style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <IconSliders size={14} /> Run Simulation
          </button>
        </div>
      </div>

      {/* National KPI strip */}
      {!l1 && summary && (
        <div className="dash-stat-strip">
          <Stat label="Total Sectors"    value={summary.total_sectors}      />
          <Stat label="Districts"         value={summary.total_districts}    />
          <Stat label="National Avg CDI"  value={summary.national_avg_cdi?.toFixed(1)} sub="/ 100" />
          <Stat label="Lagging Sectors"   value={summary.lagging_sectors}    color="#dc2626" sub="need priority action" />
          <Stat label="Avg Poverty Rate"  value={summary.avg_poverty_rate != null ? `${(summary.avg_poverty_rate * 100).toFixed(1)}%` : '—'} />
          <Stat label="Most Developed"    value={summary.most_developed}     color="#16a34a" />
        </div>
      )}

      {/* Alert if lagging sectors */}
      {summary?.lagging_sectors > 0 && (
        <AlertBar type="warning">
          <strong>{summary.lagging_sectors} sectors</strong> across Rwanda are below CDI 40 (Lagging tier) and require immediate infrastructure investment.
          <button onClick={() => navigate('/national')} style={{ marginLeft: 10, fontWeight: 600, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 13 }}>
            View on map →
          </button>
        </AlertBar>
      )}

      {/* Main 2-column content */}
      <div className="grid-2">
        {/* Underserved sectors — publish candidate list */}
        <DashCard title="Most Underserved Sectors" Icon={IconTrendingDown} action="/national" actionLabel="Full national map →">
          {l2
            ? <div className="loading"><div className="spinner" />Loading…</div>
            : (
              <div>
                {laggingList.map((s, i) => (
                  <div key={s.adm3_en} className="underserved-row">
                    <div className="underserved-rank">#{i + 1}</div>
                    <div className="underserved-info">
                      <div className="underserved-name">{s.adm3_en}</div>
                      <div className="underserved-district">{s.adm2_en} District</div>
                    </div>
                    <div className="underserved-scores">
                      <div className="underserved-cdi" style={{ color: '#dc2626' }}>{s.cdi?.toFixed(1)}</div>
                      <div style={{ fontSize: 10, color: 'var(--gray-400)' }}>CDI</div>
                    </div>
                    <div className="underserved-missing">
                      {s.road_density_km_per_km2 < 0.3 && <span className="missing-tag">Roads</span>}
                      {s.health_facility_count < 2   && <span className="missing-tag">Health</span>}
                      {s.school_count < 3             && <span className="missing-tag">Schools</span>}
                    </div>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                  <button
                    onClick={() => sectors && laggingList.length && generateMinistryPublication(
                      sectors,
                      laggingList.map(s => s.adm3_en),
                      {}
                    )}
                    className="btn btn-primary"
                    disabled={!sectors || !laggingList.length}
                    style={{ fontSize: 12, background: meta.accent, borderColor: meta.accent, display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <IconShare size={13} /> Publish Underserved Sectors
                  </button>
                  <button
                    onClick={() => navigate('/simulation')}
                    className="btn btn-secondary"
                    style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <IconSliders size={13} /> Simulate Interventions
                  </button>
                </div>
              </div>
            )
          }
        </DashCard>

        {/* District equity chart */}
        <DashCard title="District CDI Equity — 12 Lowest" Icon={IconBarChart} action="/district" actionLabel="Full district reports →">
          {l2
            ? <div className="loading"><div className="spinner" />Loading…</div>
            : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={distAvg} layout="vertical" margin={{ left: 72, right: 24, top: 0, bottom: 0 }}>
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={68} />
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
        </DashCard>
      </div>

      {/* Quick actions */}
      <div className="dash-actions-section">
        <div className="dash-section-label">QUICK ACTIONS</div>
        <div className="dash-actions-grid">
          <ActionButton label="National Map"    to="/national"    Icon={IconGlobe}   accent={meta.accent} />
          <ActionButton label="District Reports" to="/district"   Icon={IconMap}     accent="#2563eb" />
          <ActionButton label="Run Simulation"   to="/simulation" Icon={IconSliders} accent="#7c3aed" />
          <ActionButton label="User Management"  to="/users"      Icon={IconUsers}   accent="#dc2626" />
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   DISTRICT OFFICER DASHBOARD
   Operations center scoped to their district
═══════════════════════════════════════════════════════════════ */
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

  const ranked    = sectors ? [...sectors].sort((a, b) => a.cdi - b.cdi) : []
  const lagging   = ranked.filter(s => s.is_lagging)
  const bottom4   = ranked.slice(0, 4)

  function getMissing(s) {
    const items = []
    if ((s.road_density_km_per_km2 ?? 0) < 0.3)   items.push('Roads')
    if ((s.health_facility_count   ?? 0) < 2)       items.push('Health')
    if ((s.school_count            ?? 0) < 3)       items.push('Schools')
    if ((s.nightlight_mean         ?? 0) < 1.5)     items.push('Electricity')
    return items
  }

  return (
    <div className="gap-16">
      {/* Header */}
      <div className="dash-command-header" style={{ borderLeftColor: meta.accent }}>
        <div className="dash-command-left">
          <div className="dash-command-title">{district} District Operations Center</div>
          <div className="dash-command-sub">
            Welcome, <strong>{user?.name}</strong> &nbsp;·&nbsp; District Officer &nbsp;·&nbsp;
            {new Date().toLocaleDateString('en-RW', { month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
        <div className="dash-command-actions">
          <button onClick={() => navigate('/district')} className="btn btn-primary"
            style={{ background: meta.accent, borderColor: meta.accent, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <IconMap size={14} /> District Overview
          </button>
          <button onClick={() => navigate('/simulation')} className="btn btn-secondary"
            style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <IconSliders size={14} /> Simulation
          </button>
        </div>
      </div>

      {/* District KPIs */}
      {!l1 && summary && (
        <div className="dash-stat-strip">
          <Stat label="Sectors"         value={summary.n_sectors} />
          <Stat label="Average CDI"     value={summary.avg_cdi?.toFixed(1)} sub="/ 100" />
          <Stat label="Lagging Sectors" value={summary.lagging_sectors} color="#dc2626" sub="below avg by >10 pts" />
          <Stat label="Average Poverty" value={summary.avg_poverty != null ? `${(summary.avg_poverty * 100).toFixed(1)}%` : '—'} />
          <Stat label="Best Sector"     value={summary.best_sector}  color="#16a34a" />
          <Stat label="Needs Attention" value={summary.worst_sector} color="#dc2626" />
        </div>
      )}

      {lagging.length > 0 && (
        <AlertBar type="warning">
          <strong>{lagging.length} sector{lagging.length > 1 ? 's' : ''}</strong> in {district} are significantly behind the district average:&nbsp;
          <strong>{lagging.map(s => s.adm3_en).join(', ')}</strong>. Consider submitting investment requests to MINALOC / MINIFRA.
        </AlertBar>
      )}

      <div className="grid-2">
        {/* CDI ranking bar */}
        <DashCard title={`Sector CDI Ranking — ${district}`} Icon={IconBarChart} action="/district" actionLabel="Full overview →">
          {l2
            ? <div className="loading"><div className="spinner" />Loading…</div>
            : (
              <ResponsiveContainer width="100%" height={Math.max(200, ranked.length * 22)}>
                <BarChart data={ranked} layout="vertical" margin={{ left: 90, right: 36, top: 0, bottom: 0 }}>
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="adm3_en" tick={{ fontSize: 10 }} width={86} />
                  <Tooltip formatter={v => [v.toFixed(1), 'CDI']} contentStyle={{ fontSize: 11 }} />
                  <Bar dataKey="cdi" radius={2}>
                    {ranked.map((d, i) => (
                      <Cell key={i} fill={d.cdi < 35 ? '#dc2626' : d.cdi < 55 ? '#ca8a04' : d.cdi < 75 ? '#16a34a' : '#1d4ed8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )
          }
        </DashCard>

        {/* Underserved sectors + missing infra */}
        <DashCard title="Underserved Sectors — Infrastructure Gaps" Icon={IconAlertTriangle} action="/simulation" actionLabel="Plan interventions →">
          {l2
            ? <div className="loading"><div className="spinner" />Loading…</div>
            : (
              <div>
                {bottom4.map((s, i) => {
                  const missing = getMissing(s)
                  return (
                    <div key={s.adm3_en} className="underserved-row" style={{ paddingBottom: 12, marginBottom: 12, borderBottom: i < 3 ? '1px solid var(--gray-100)' : 'none' }}>
                      <div className="underserved-rank" style={{ background: s.is_lagging ? '#fef2f2' : 'var(--gray-100)', color: s.is_lagging ? '#dc2626' : 'var(--gray-600)' }}>
                        #{i + 1}
                      </div>
                      <div className="underserved-info">
                        <div className="underserved-name">
                          {s.adm3_en}
                          {s.is_lagging && <span className="lagging-tag">LAGGING</span>}
                        </div>
                        <div className="underserved-district">CDI {s.cdi?.toFixed(1)} · Poverty {s.predicted_poverty_rate != null ? `${(s.predicted_poverty_rate * 100).toFixed(0)}%` : '—'}</div>
                        {missing.length > 0 && (
                          <div style={{ marginTop: 5, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 10, color: 'var(--gray-400)' }}>Missing:</span>
                            {missing.map(m => <span key={m} className="missing-tag">{m}</span>)}
                          </div>
                        )}
                      </div>
                      <div className="underserved-cdi" style={{ color: s.cdi < 40 ? '#dc2626' : s.cdi < 60 ? '#ca8a04' : '#16a34a' }}>
                        {s.cdi?.toFixed(1)}
                      </div>
                    </div>
                  )
                })}
                <button
                  onClick={() => navigate('/simulation')}
                  className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center', marginTop: 4, fontSize: 12, background: meta.accent, borderColor: meta.accent, display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <IconSliders size={13} /> Simulate infrastructure additions
                </button>
              </div>
            )
          }
        </DashCard>
      </div>

      {/* Quick actions */}
      <div className="dash-actions-section">
        <div className="dash-section-label">QUICK ACTIONS</div>
        <div className="dash-actions-grid">
          <ActionButton label="District Overview"  to="/district"   Icon={IconMap}     accent={meta.accent} />
          <ActionButton label="Sector Reports"     to="/sector"     Icon={IconMapPin}  accent="#16a34a" />
          <ActionButton label="Run Simulation"     to="/simulation" Icon={IconSliders} accent="#7c3aed" />
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   SECTOR OFFICER DASHBOARD
   Infrastructure monitoring + poverty + CDI status
═══════════════════════════════════════════════════════════════ */
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
  const distAvg = sectorData?.district_avg_cdi  ?? 0

  const dAvg = key => distSectors?.length
    ? (distSectors.reduce((s, r) => s + (r[key] ?? 0), 0) / distSectors.length)
    : 0

  const infraStatus = [
    { key: 'road_density_km_per_km2', Icon: IconRoad,     label: 'Roads',       unit: 'km/km²', fmt: v => v.toFixed(2) },
    { key: 'health_facility_count',   Icon: IconActivity, label: 'Health Posts', unit: '',       fmt: v => Math.round(v) },
    { key: 'school_count',            Icon: IconBookOpen, label: 'Schools',      unit: '',       fmt: v => Math.round(v) },
    { key: 'nightlight_mean',         Icon: IconZap,      label: 'Electricity',  unit: '',       fmt: v => v.toFixed(1) },
  ]

  const csvContent = sectorData ? [
    'Field,Value',
    `Sector,${sector}`, `District,${district}`,
    `CDI Score,${sectorData.cdi?.toFixed(1)}`,
    `National Rank,#${sectorData.cdi_national_rank}`,
    `District Rank,#${sectorData.cdi_district_rank}`,
    `Tier,${sectorData.tier}`,
    `Poverty Rate,${sectorData.predicted_poverty_rate != null ? `${(sectorData.predicted_poverty_rate * 100).toFixed(1)}%` : ''}`,
    `Road Density,${sectorData.road_density_km_per_km2?.toFixed(3) ?? ''}`,
    `Health Posts,${sectorData.health_facility_count ?? ''}`,
    `Schools,${sectorData.school_count ?? ''}`,
    `Gap vs District Avg,${gap.toFixed(1)} points`,
    `Priority Action,${gap < -10 ? 'YES - Investment Required' : 'Monitor'}`,
  ].join('\n') : ''

  return (
    <div className="gap-16">
      {/* Header */}
      <div className="dash-command-header" style={{ borderLeftColor: meta.accent }}>
        <div className="dash-command-left">
          <div className="dash-command-title">{sector} Sector Monitoring Panel</div>
          <div className="dash-command-sub">
            <strong>{user?.name}</strong> &nbsp;·&nbsp; Sector Officer &nbsp;·&nbsp; {district} District
          </div>
        </div>
        <div className="dash-command-actions">
          <button onClick={() => navigate('/simulation')} className="btn btn-primary"
            style={{ background: meta.accent, borderColor: meta.accent, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <IconSliders size={14} /> Simulate Investment
          </button>
          {sectorData && (
            <a
              href={`data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`}
              download={`sector_report_${sector?.replace(/\s+/g, '_')}.csv`}
              className="btn btn-secondary"
              style={{ fontSize: 12, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <IconFileText size={14} /> Export Report
            </a>
          )}
        </div>
      </div>

      {/* Alert */}
      {!l1 && sectorData && (
        gap < -10
          ? <AlertBar type="danger">
              LAG ALERT — {sector} is <strong>{Math.abs(gap).toFixed(1)} CDI points</strong> below the {district} district average ({distAvg.toFixed(1)}). Consider requesting infrastructure investment.
            </AlertBar>
          : gap < 0
            ? <AlertBar type="warning">
                {sector} is {Math.abs(gap).toFixed(1)} points below district average. Monitor infrastructure levels closely.
              </AlertBar>
            : <AlertBar type="success">
                {sector} is {gap.toFixed(1)} points above the district average. Maintain current infrastructure levels.
              </AlertBar>
      )}

      {/* KPI cards */}
      {sectorData && !l1 && (
        <div className="dash-stat-strip">
          <Stat label="CDI Score"      value={sectorData.cdi?.toFixed(1)}   sub="/ 100" color={gap < -10 ? '#dc2626' : gap < 0 ? '#ca8a04' : '#16a34a'} />
          <Stat label="Poverty Rate"   value={sectorData.predicted_poverty_rate != null ? `${(sectorData.predicted_poverty_rate * 100).toFixed(1)}%` : '—'} color="#dc2626" />
          <Stat label="District Rank"  value={`#${sectorData.cdi_district_rank}`} />
          <Stat label="National Rank"  value={`#${sectorData.cdi_national_rank}`} />
          <Stat label="Development Tier" value={sectorData.tier} color={sectorData.tier === 'Lagging' ? '#dc2626' : sectorData.tier === 'Developing' ? '#ca8a04' : '#16a34a'} />
          <Stat label="vs District Avg" value={`${gap > 0 ? '+' : ''}${gap.toFixed(1)}`} color={gap >= 0 ? '#16a34a' : '#dc2626'} sub="CDI points" />
        </div>
      )}

      <div className="grid-2">
        {/* Infrastructure status bars */}
        <DashCard title="Infrastructure Status vs District Average" Icon={IconBuilding}>
          {(l1 || l2)
            ? <div className="loading"><div className="spinner" />Loading…</div>
            : sectorData
              ? (
                <div className="infra-status-list">
                  {infraStatus.map(({ key, Icon: InfraIcon, label, unit, fmt }) => {
                    const myVal  = sectorData[key] ?? 0
                    const avgVal = dAvg(key)
                    const maxVal = Math.max(myVal, avgVal) * 1.3 || 1
                    const myPct  = Math.min(100, (myVal  / maxVal) * 100)
                    const avgPct = Math.min(100, (avgVal / maxVal) * 100)
                    const behind = myVal < avgVal * 0.8
                    return (
                      <div key={key} className="infra-status-item">
                        <div className="infra-status-header">
                          <InfraIcon size={13} color={behind ? '#dc2626' : 'var(--gray-500)'} style={{ flexShrink: 0 }} />
                          <span className="infra-status-label">{label}</span>
                          <span className={`infra-status-val ${behind ? 'infra-behind' : 'infra-ok'}`}>
                            {fmt(myVal)} {unit}
                          </span>
                        </div>
                        <div className="infra-bar-wrap">
                          <div className="infra-bar-track">
                            <div
                              className="infra-bar-fill"
                              style={{ width: `${myPct}%`, background: behind ? '#dc2626' : meta.accent }}
                            />
                            <div className="infra-bar-avg-mark" style={{ left: `${avgPct}%` }} title={`District avg: ${fmt(avgVal)}`} />
                          </div>
                          <div className="infra-bar-legend">
                            <span>0</span>
                            <span style={{ color: 'var(--gray-400)', fontSize: 10 }}>District avg: {fmt(avgVal)}</span>
                          </div>
                        </div>
                        {behind && (
                          <div className="infra-behind-tag">Below district average — investment needed</div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
              : <div className="empty-state">No sector data available.</div>
          }
        </DashCard>

        {/* Development status + actions */}
        <DashCard title="Development Status" Icon={IconTrendingUp}>
          {sectorData && !l1 ? (
            <>
              <div className="sector-tier-display">
                <div className="sector-tier-label">Current Development Tier</div>
                <div className={`tier-badge tier-${sectorData.tier}`} style={{ fontSize: 16, padding: '8px 20px', marginBottom: 8 }}>
                  {sectorData.tier}
                </div>
                <div style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 4 }}>
                  District average: <strong>{distAvg.toFixed(1)}</strong> &nbsp;·&nbsp; Your CDI:{' '}
                  <strong style={{ color: gap < -10 ? '#dc2626' : gap < 0 ? '#ca8a04' : meta.accent }}>
                    {sectorData.cdi?.toFixed(1)}
                  </strong>
                </div>
              </div>

              {distSectors && (
                <ResponsiveContainer width="100%" height={160}>
                  <RadarChart
                    data={[
                      { subject: 'Roads',   A: Math.min(100, (sectorData.road_density_km_per_km2 / 2) * 100) },
                      { subject: 'Health',  A: Math.min(100, (sectorData.health_facility_count / 5) * 100) },
                      { subject: 'Schools', A: Math.min(100, (sectorData.school_count / 10) * 100) },
                      { subject: 'Energy',  A: Math.min(100, (sectorData.nightlight_mean / 5) * 100) },
                      { subject: 'CDI',     A: sectorData.cdi ?? 0 },
                    ]}
                    margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
                  >
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                    <Radar name="Sector" dataKey="A" stroke={meta.accent} fill={meta.accent} fillOpacity={0.25} />
                  </RadarChart>
                </ResponsiveContainer>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                <button onClick={() => navigate('/sector')} className="btn btn-primary"
                  style={{ justifyContent: 'center', fontSize: 12, background: meta.accent, borderColor: meta.accent }}>
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
          ) : <div className="loading"><div className="spinner" />Loading…</div>}
        </DashCard>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   ANALYST / POLICY RESEARCHER DASHBOARD
═══════════════════════════════════════════════════════════════ */
function AnalystHome() {
  const { user }  = useAuth()
  const navigate  = useNavigate()
  const meta      = ROLE_META.analyst

  const { data: summary, loading: l1 } = useApi(getNationalSummary)
  const { data: perf,    loading: l2 } = useApi(getModelPerformance)

  return (
    <div className="gap-16">
      <div className="dash-command-header" style={{ borderLeftColor: meta.accent }}>
        <div className="dash-command-left">
          <div className="dash-command-title">Research & Policy Analysis Center</div>
          <div className="dash-command-sub">
            Welcome, <strong>{user?.name}</strong> &nbsp;·&nbsp; Policy Analyst &nbsp;·&nbsp; Full read access
          </div>
        </div>
        <button onClick={() => navigate('/simulation')} className="btn btn-primary"
          style={{ background: meta.accent, borderColor: meta.accent, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <IconFlask size={14} /> Launch Simulation
        </button>
      </div>

      {!l1 && summary && (
        <div className="dash-stat-strip">
          <Stat label="Sectors in Dataset"  value={summary.total_sectors} />
          <Stat label="Districts"            value={summary.total_districts} />
          <Stat label="National Avg CDI"     value={summary.national_avg_cdi?.toFixed(1)} sub="/ 100" />
          <Stat label="Lagging Sectors"      value={summary.lagging_sectors} color="#dc2626" />
          <Stat label="Avg Poverty Rate"     value={summary.avg_poverty_rate != null ? `${(summary.avg_poverty_rate * 100).toFixed(1)}%` : '—'} />
          <Stat label="Least Developed"      value={summary.least_developed} color="#dc2626" />
        </div>
      )}

      <div className="grid-2">
        {/* Model performance */}
        <DashCard title="Predictive Model Performance" Icon={IconCpu}>
          {l2
            ? <div className="loading"><div className="spinner" />Loading…</div>
            : !perf || perf.trained === false
              ? <div style={{ color: 'var(--gray-400)', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>
                  Model not yet trained. Run Notebook 03 to generate predictions.
                </div>
              : (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                    {[
                      { l: 'R² Score',     v: perf.r2?.toFixed(3),  note: '1.0 = perfect fit' },
                      { l: 'MAE',          v: perf.mae?.toFixed(4), note: 'lower is better' },
                      { l: 'Training Rows', v: perf.n_samples,       note: 'data points' },
                      { l: 'Features',     v: perf.n_features,      note: 'input variables' },
                    ].map(({ l, v, note }) => (
                      <div key={l} className="model-stat-box">
                        <div className="model-stat-label">{l}</div>
                        <div className="model-stat-value">{v ?? '—'}</div>
                        <div className="model-stat-note">{note}</div>
                      </div>
                    ))}
                  </div>
                  {perf.importances && (
                    <>
                      <div className="dash-section-label" style={{ marginBottom: 8 }}>Feature Importance</div>
                      {Object.entries(perf.importances).sort(([,a],[,b]) => b - a).map(([k, v]) => (
                        <div key={k} style={{ marginBottom: 7 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
                            <span style={{ color: 'var(--gray-600)' }}>{k.replace(/_/g, ' ')}</span>
                            <span style={{ fontWeight: 600 }}>{(v * 100).toFixed(1)}%</span>
                          </div>
                          <div style={{ height: 4, background: 'var(--gray-100)', borderRadius: 2 }}>
                            <div style={{ height: '100%', width: `${v * 100}%`, background: meta.accent, borderRadius: 2 }} />
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )
          }
        </DashCard>

        {/* Module nav */}
        <DashCard title="Research Modules" Icon={IconFolder}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { NavIcon: IconGlobe,   label: 'National Overview',  sub: 'Country-wide CDI map & sector rankings', to: '/national'    },
              { NavIcon: IconMap,     label: 'District Planner',    sub: 'Compare sectors within any district',    to: '/district'   },
              { NavIcon: IconMapPin,  label: 'Sector Planner',      sub: 'Deep-dive indicators for one sector',    to: '/sector'     },
              { NavIcon: IconFlask,   label: 'Simulation Engine',   sub: 'What-if scenarios for any intervention', to: '/simulation' },
            ].map(({ NavIcon, label, sub, to }) => (
              <button key={to} onClick={() => navigate(to)} className="research-module-btn">
                <NavIcon size={16} color="var(--gray-500)" style={{ flexShrink: 0 }} />
                <div>
                  <div className="research-module-label">{label}</div>
                  <div className="research-module-sub">{sub}</div>
                </div>
                <span style={{ marginLeft: 'auto', color: 'var(--gray-300)', fontSize: 16 }}>›</span>
              </button>
            ))}
          </div>
        </DashCard>
      </div>
    </div>
  )
}

/* ── Root router ──────────────────────────────────────────────────────────────── */
export default function Home() {
  const { role } = useRole()

  if (role === 'national_admin')   return <MinistryHome />
  if (role === 'district_officer') return <DistrictHome />
  if (role === 'sector_officer')   return <SectorHome />
  if (role === 'analyst')          return <AnalystHome />
  return <MinistryHome />
}
