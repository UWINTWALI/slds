import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useApi } from '../hooks/useApi'
import { getNationalSummary, getNationalSectors, getNationalGeojson, getModelPerformance } from '../api/client'
import MetricCard from '../components/MetricCard'
import DataTable from '../components/DataTable'
import ChoroplethMap from '../components/ChoroplethMap'

const COLOR_BY_OPTIONS = [
  { value: 'cdi',                      label: 'Composite Development Index' },
  { value: 'nightlight_mean',          label: 'Night Light Intensity' },
  { value: 'predicted_poverty_rate',   label: 'Poverty Rate' },
  { value: 'road_density_km_per_km2',  label: 'Road Density' },
  { value: 'health_facility_count',    label: 'Health Facilities' },
  { value: 'school_count',             label: 'Schools' },
]

const TABLE_COLS = ['adm3_en','adm2_en','cdi','cdi_national_rank','tier',
                    'predicted_poverty_rate','road_density_km_per_km2',
                    'health_facility_count','school_count','is_lagging']

export default function NationalOverview() {
  const [colorBy,  setColorBy]  = useState('nightlight_mean')
  const [rankView, setRankView] = useState('bottom')

  const { data: summary,  loading: l1 } = useApi(getNationalSummary)
  const { data: sectors,  loading: l2 } = useApi(getNationalSectors)
  const { data: geojson,  loading: l3 } = useApi(getNationalGeojson)
  const { data: perf,     loading: l4 } = useApi(getModelPerformance)

  if (l1 || l2) return <div className="loading"><div className="spinner" /> Loading national data…</div>

  const top10    = sectors ? [...sectors].sort((a,b) => b.cdi - a.cdi).slice(0,10)    : []
  const bottom10 = sectors ? [...sectors].sort((a,b) => a.cdi - b.cdi).slice(0,10)    : []
  const shown    = rankView === 'top' ? top10 : bottom10

  // District averages for equity chart
  const distMap = {}
  sectors?.forEach(r => {
    if (!r.adm2_en) return
    if (!distMap[r.adm2_en]) distMap[r.adm2_en] = []
    distMap[r.adm2_en].push(r.cdi)
  })
  const distAvg = Object.entries(distMap)
    .map(([name, vals]) => ({ name, cdi: +(vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1) }))
    .sort((a,b) => a.cdi - b.cdi)

  return (
    <div className="gap-16">
      {/* KPIs */}
      <div className="metric-row">
        <MetricCard label="Sectors"        value={summary?.total_sectors} />
        <MetricCard label="Districts"      value={summary?.total_districts} />
        <MetricCard label="Avg CDI"        value={summary?.national_avg_cdi?.toFixed(1)} delta="/ 100" />
        <MetricCard label="Lagging sectors" value={summary?.lagging_sectors}
          delta={summary?.lagging_sectors > 0 ? 'need priority attention' : 'None lagging'}
          deltaType={summary?.lagging_sectors > 0 ? 'negative' : 'positive'} />
        <MetricCard label="Avg Poverty"
          value={summary?.avg_poverty_rate != null ? `${(summary.avg_poverty_rate*100).toFixed(1)}%` : '—'} />
      </div>

      {/* Map + Equity chart */}
      <div className="grid-2">
        <div className="card">
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <div className="card-title" style={{ marginBottom:0 }}>Rwanda — Sector Map</div>
            <select
              value={colorBy}
              onChange={e => setColorBy(e.target.value)}
              style={{ width:'auto', padding:'4px 8px', fontSize:12 }}
            >
              {COLOR_BY_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          {l3
            ? <div className="loading"><div className="spinner"/>Loading map…</div>
            : <ChoroplethMap geojson={geojson} colorBy={colorBy} height={380} />
          }
          <div style={{ fontSize:11, color:'var(--gray-500)', marginTop:8, display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ fontSize:13 }}>Low</span>
            <span style={{
              display:'inline-block', width:100, height:10, borderRadius:3,
              background: colorBy === 'nightlight_mean'
                ? 'linear-gradient(to right, #000000, #3c1400, #b45000, #ffb400, #ffff50)'
                : colorBy === 'predicted_poverty_rate'
                ? 'linear-gradient(to right, #fcfdbf, #fe9f6d, #de4968, #4f1275, #000004)'
                : 'linear-gradient(to right, #000004, #4f1275, #de4968, #fe9f6d, #fcfdbf)',
              margin:'0 4px',
            }} />
            <span style={{ fontSize:13 }}>High</span>
            {colorBy === 'predicted_poverty_rate' && <span style={{ marginLeft:8, color:'var(--gray-400)' }}>(bright = low poverty)</span>}
          </div>
        </div>

        <div className="card">
          <div className="card-title">District Equity — Average CDI</div>
          <ResponsiveContainer width="100%" height={380}>
            <BarChart data={distAvg} layout="vertical" margin={{ left:80, right:30, top:4, bottom:4 }}>
              <XAxis type="number" domain={[0,100]} tick={{ fontSize:11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize:11 }} width={78} />
              <Tooltip
                formatter={v => [v.toFixed(1), 'Avg CDI']}
                contentStyle={{ fontSize:12, border:'1px solid var(--gray-200)' }}
              />
              <Bar dataKey="cdi" radius={2}>
                {distAvg.map((d, i) => (
                  <Cell key={i} fill={d.cdi < 35 ? '#dc2626' : d.cdi < 55 ? '#ca8a04' : d.cdi < 75 ? '#16a34a' : '#27272a'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Ranking table */}
      <div className="card">
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
          <div className="card-title" style={{ marginBottom:0 }}>Sector Ranking</div>
          <div className="tabs" style={{ margin:0, borderBottom:'none' }}>
            <button className={`tab ${rankView==='bottom'?'active':''}`} onClick={() => setRankView('bottom')}>
              Bottom 10 (most underserved)
            </button>
            <button className={`tab ${rankView==='top'?'active':''}`} onClick={() => setRankView('top')}>
              Top 10 (most developed)
            </button>
          </div>
          <div style={{ marginLeft:'auto' }}>
            <a
              href={`data:text/csv;charset=utf-8,${encodeURIComponent(
                sectors?.length ? [Object.keys(sectors[0]).join(','), ...sectors.map(r=>Object.values(r).join(','))].join('\n') : ''
              )}`}
              download="slds_national_sectors.csv"
              className="btn btn-secondary"
              style={{ fontSize:12 }}
            >
              ↓ Export CSV
            </a>
          </div>
        </div>
        <DataTable rows={shown} columns={TABLE_COLS} />
      </div>

      {/* Model performance */}
      {!l4 && perf && (
        <div className="card">
          <div className="card-title">Predictive Model Performance</div>
          {perf.trained === false
            ? <div className="alert alert-info">Model not trained yet. Run Notebook 03 first.</div>
            : (
              <div>
                <div className="metric-row" style={{ marginBottom:16 }}>
                  <MetricCard label="R² Score"     value={perf.r2?.toFixed(3)}   delta="1.0 = perfect" />
                  <MetricCard label="MAE"           value={perf.mae?.toFixed(4)}  delta="lower is better" />
                  <MetricCard label="Training rows" value={perf.n_samples} />
                  <MetricCard label="Features"      value={perf.n_features} />
                </div>
                {perf.importances && (
                  <>
                    <div style={{ fontSize:12, fontWeight:500, marginBottom:8, color:'var(--gray-600)' }}>
                      Feature Importance
                    </div>
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart
                        data={Object.entries(perf.importances).map(([k,v]) => ({ name: k.replace(/_/g,' '), value: v }))}
                        layout="vertical"
                        margin={{ left:140, right:30, top:0, bottom:0 }}
                      >
                        <XAxis type="number" tick={{ fontSize:11 }} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize:11 }} width={130} />
                        <Tooltip formatter={v=>[v.toFixed(4),'Importance']} contentStyle={{ fontSize:12 }} />
                        <Bar dataKey="value" fill="var(--gray-700)" radius={2} />
                      </BarChart>
                    </ResponsiveContainer>
                  </>
                )}
              </div>
            )
          }
        </div>
      )}
    </div>
  )
}
