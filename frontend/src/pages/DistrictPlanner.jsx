import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
         RadarChart, Radar, PolarGrid, PolarAngleAxis, Cell } from 'recharts'
import { useApi } from '../hooks/useApi'
import { getDistricts, getDistrictSummary, getDistrictSectors, getDistrictGeojson } from '../api/client'
import MetricCard from '../components/MetricCard'
import DataTable from '../components/DataTable'
import ChoroplethMap from '../components/ChoroplethMap'

const TABLE_COLS = ['adm3_en','cdi','cdi_district_rank','tier',
                    'predicted_poverty_rate','road_density_km_per_km2',
                    'health_facility_count','school_count','is_lagging']

const FEAT_LABELS = {
  cdi:                     'CDI',
  predicted_poverty_rate:  'Poverty',
  road_density_km_per_km2: 'Roads',
  health_facility_count:   'Health',
  school_count:            'Schools',
  nightlight_mean:         'Night Light',
}

function normalize(val, arr) {
  const lo = Math.min(...arr), hi = Math.max(...arr)
  return hi === lo ? 0.5 : (val - lo) / (hi - lo)
}

export default function DistrictPlanner() {
  const [district,    setDistrict]    = useState('')
  const [compareA,    setCompareA]    = useState('')
  const [compareB,    setCompareB]    = useState('')
  const [tab,         setTab]         = useState('ranking')
  const [ganttMonths, setGanttMonths] = useState(12)
  const [mapColorBy,  setMapColorBy]  = useState('nightlight_mean')

  const { data: districts } = useApi(getDistricts)

  useEffect(() => {
    if (districts?.length && !district) setDistrict(districts[0])
  }, [districts])

  const { data: summary, loading: ls } = useApi(() => district ? getDistrictSummary(district) : Promise.resolve(null), [district])
  const { data: sectors, loading: lr }  = useApi(() => district ? getDistrictSectors(district) : Promise.resolve([]), [district])
  const { data: geojson, loading: lm }  = useApi(() => district ? getDistrictGeojson(district) : Promise.resolve(null), [district])

  useEffect(() => {
    if (sectors?.length) {
      setCompareA(sectors[0]?.adm3_en ?? '')
      setCompareB(sectors[1]?.adm3_en ?? '')
    }
  }, [sectors])

  const sectorNames = sectors?.map(s => s.adm3_en).filter(Boolean) ?? []
  const rowA = sectors?.find(s => s.adm3_en === compareA)
  const rowB = sectors?.find(s => s.adm3_en === compareB)

  // Gantt data — bottom n sectors by CDI
  const ganttSectors = sectors ? [...sectors].sort((a,b) => a.cdi - b.cdi).slice(0, 10) : []
  const today = new Date()
  const ganttData = ganttSectors.map((s, i) => ({
    name:  s.adm3_en,
    start: i * ganttMonths,
    dur:   ganttMonths,
    cdi:   s.cdi,
  }))

  // CDI bar chart
  const barData = sectors ? [...sectors].sort((a,b) => a.cdi - b.cdi) : []
  const distAvg = summary?.avg_cdi ?? 0

  return (
    <div className="gap-16">
      {/* District selector */}
      <div className="card" style={{ padding:'14px 20px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <div className="form-group" style={{ marginBottom:0, minWidth:220 }}>
            <label style={{ marginBottom:4 }}>District</label>
            <select value={district} onChange={e => setDistrict(e.target.value)}>
              {districts?.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          {summary && !ls && (
            <div style={{ display:'flex', gap:24, flexWrap:'wrap' }}>
              {[
                { l:'Sectors',       v: summary.n_sectors },
                { l:'Avg CDI',       v: summary.avg_cdi?.toFixed(1) },
                { l:'Lagging',       v: summary.lagging_sectors },
                { l:'Avg Poverty',   v: summary.avg_poverty != null ? `${(summary.avg_poverty*100).toFixed(1)}%` : '—' },
                { l:'Best sector',   v: summary.best_sector },
                { l:'Worst sector',  v: summary.worst_sector },
              ].map(({ l, v }) => (
                <div key={l}>
                  <div style={{ fontSize:10, color:'var(--gray-400)', textTransform:'uppercase', letterSpacing:'.06em' }}>{l}</div>
                  <div style={{ fontSize:14, fontWeight:600 }}>{v ?? '—'}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {['ranking','map','compare','gantt'].map(t => (
          <button key={t} className={`tab ${tab===t?'active':''}`} onClick={()=>setTab(t)}>
            {{ ranking:'Sector Ranking', map:'District Map', compare:'Compare Sectors', gantt:'Sequencing' }[t]}
          </button>
        ))}
      </div>

      {/* Ranking tab */}
      {tab === 'ranking' && (
        <div className="gap-16">
          {/* CDI bar chart */}
          <div className="card">
            <div className="card-title">Sector CDI Scores — {district}</div>
            {lr
              ? <div className="loading"><div className="spinner"/>Loading…</div>
              : (
                <ResponsiveContainer width="100%" height={Math.max(240, barData.length * 26)}>
                  <BarChart data={barData} layout="vertical" margin={{ left:100, right:40, top:0, bottom:0 }}>
                    <XAxis type="number" domain={[0,100]} tick={{ fontSize:11 }} />
                    <YAxis type="category" dataKey="adm3_en" tick={{ fontSize:11 }} width={96} />
                    <Tooltip formatter={v=>[v.toFixed(1),'CDI']} contentStyle={{ fontSize:12 }} />
                    <Bar dataKey="cdi" radius={2}>
                      {barData.map((d,i) => (
                        <Cell key={i} fill={
                          d.cdi < 35 ? '#dc2626'
                        : d.cdi < 55 ? '#ca8a04'
                        : d.cdi < 75 ? '#16a34a'
                        : '#27272a'
                        }/>
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )
            }
            <div style={{ fontSize:11, color:'var(--gray-400)', marginTop:6 }}>
              Red = Lagging · Orange = Developing · Green = Progressing · Black = Advanced
            </div>
          </div>

          {/* Table */}
          <div className="card">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <div className="card-title" style={{ marginBottom:0 }}>Ranking Table</div>
              <a
                href={`data:text/csv;charset=utf-8,${encodeURIComponent(
                  sectors?.length ? [Object.keys(sectors[0]).join(','), ...sectors.map(r=>Object.values(r).join(','))].join('\n') : ''
                )}`}
                download={`slds_${district}_sectors.csv`}
                className="btn btn-secondary"
                style={{ fontSize:12 }}
              >↓ Export CSV</a>
            </div>
            <DataTable rows={sectors ?? []} columns={TABLE_COLS} />
          </div>
        </div>
      )}

      {/* Map tab */}
      {tab === 'map' && (
        <div className="card">
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <div className="card-title" style={{ marginBottom:0 }}>Map — {district}</div>
            <select
              value={mapColorBy}
              onChange={e => setMapColorBy(e.target.value)}
              style={{ width:'auto', padding:'4px 8px', fontSize:12 }}
            >
              <option value="cdi">CDI</option>
              <option value="nightlight_mean">Night Light</option>
              <option value="predicted_poverty_rate">Poverty Rate</option>
              <option value="road_density_km_per_km2">Road Density</option>
              <option value="health_facility_count">Health Facilities</option>
              <option value="school_count">Schools</option>
            </select>
          </div>
          {lm
            ? <div className="loading"><div className="spinner"/>Loading map…</div>
            : geojson?.features?.length
              ? <ChoroplethMap geojson={geojson} colorBy={mapColorBy} height={500} />
              : <div className="empty-state">Map data not available</div>
          }
          <div style={{ fontSize:11, color:'var(--gray-400)', marginTop:6 }}>
            {mapColorBy === 'nightlight_mean'
              ? 'Black = no light · Yellow = high electrification'
              : mapColorBy === 'predicted_poverty_rate'
              ? 'Bright = low poverty · Dark = high poverty'
              : 'Bright = high · Dark = low'}
          </div>
        </div>
      )}

      {/* Compare tab */}
      {tab === 'compare' && (
        <div className="gap-16">
          <div className="card">
            <div className="card-title">Compare Two Sectors</div>
            <div className="grid-2" style={{ marginBottom:20 }}>
              <div className="form-group" style={{ marginBottom:0 }}>
                <label>Sector A</label>
                <select value={compareA} onChange={e=>setCompareA(e.target.value)}>
                  {sectorNames.map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom:0 }}>
                <label>Sector B</label>
                <select value={compareB} onChange={e=>setCompareB(e.target.value)}>
                  {sectorNames.map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {rowA && rowB && (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Indicator</th>
                      <th>{compareA}</th>
                      <th>{compareB}</th>
                      <th>Better</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(FEAT_LABELS).map(([key, label]) => {
                      const vA = rowA[key], vB = rowB[key]
                      if (vA == null && vB == null) return null
                      const isPoverty = key.includes('poverty')
                      const betterA = isPoverty ? vA <= vB : vA >= vB
                      const fmt = v => key.includes('poverty') ? `${(v*100).toFixed(1)}%`
                                     : key === 'cdi'            ? v.toFixed(1)
                                     : key.includes('density')  ? v.toFixed(2)
                                     : v
                      return (
                        <tr key={key}>
                          <td style={{ color:'var(--gray-500)' }}>{label}</td>
                          <td style={{ fontWeight: betterA ? 600 : 400 }}>{vA != null ? fmt(vA) : '—'}</td>
                          <td style={{ fontWeight: betterA ? 400 : 600 }}>{vB != null ? fmt(vB) : '—'}</td>
                          <td style={{ color:'var(--gray-500)', fontSize:12 }}>
                            {vA != null && vB != null ? (betterA ? compareA : compareB) : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Radar */}
          {rowA && rowB && (() => {
            const radarKeys = ['cdi','road_density_km_per_km2','health_facility_count','school_count','nightlight_mean']
              .filter(k => rowA[k] != null)
            const allVals = k => sectors?.map(s => s[k]).filter(v => v != null) ?? []
            const data = radarKeys.map(k => ({
              subject: FEAT_LABELS[k] ?? k,
              [compareA]: +normalize(rowA[k], allVals(k)).toFixed(3),
              [compareB]: +normalize(rowB[k], allVals(k)).toFixed(3),
            }))
            return (
              <div className="card">
                <div className="card-title">Development Profile</div>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={data}>
                    <PolarGrid stroke="var(--gray-200)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize:11 }} />
                    <Radar name={compareA} dataKey={compareA} stroke="var(--black)"   fill="var(--black)"   fillOpacity={.15} />
                    <Radar name={compareB} dataKey={compareB} stroke="var(--gray-500)" fill="var(--gray-500)" fillOpacity={.10} />
                    <Tooltip contentStyle={{ fontSize:12 }} />
                  </RadarChart>
                </ResponsiveContainer>
                <div style={{ fontSize:11, color:'var(--gray-400)', display:'flex', gap:16 }}>
                  <span>— {compareA}</span>
                  <span style={{ color:'var(--gray-400)' }}>— {compareB}</span>
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {/* Gantt tab */}
      {tab === 'gantt' && (
        <div className="card">
          <div style={{ display:'flex', alignItems:'center', gap:24, marginBottom:16 }}>
            <div className="card-title" style={{ marginBottom:0 }}>Investment Sequencing — {district}</div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <label style={{ marginBottom:0, whiteSpace:'nowrap' }}>Months per project</label>
              <div className="range-wrap">
                <input type="range" min={3} max={24} value={ganttMonths} onChange={e=>setGanttMonths(+e.target.value)} style={{ width:120 }} />
                <span className="range-value">{ganttMonths}m</span>
              </div>
            </div>
          </div>
          <p style={{ fontSize:12, color:'var(--gray-500)', marginBottom:16 }}>
            Sectors with the lowest CDI are prioritised first. Adjust the slider to change project duration.
          </p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Priority</th>
                  <th>Sector</th>
                  <th>CDI</th>
                  <th>Start (month)</th>
                  <th>End (month)</th>
                  <th>Timeline</th>
                </tr>
              </thead>
              <tbody>
                {ganttData.map((r, i) => (
                  <tr key={r.name}>
                    <td style={{ color:'var(--gray-500)' }}>#{i+1}</td>
                    <td style={{ fontWeight:500 }}>{r.name}</td>
                    <td>{r.cdi.toFixed(1)}</td>
                    <td>Month {r.start + 1}</td>
                    <td>Month {r.start + r.dur}</td>
                    <td style={{ width:240 }}>
                      <div style={{
                        position: 'relative',
                        height: 10,
                        background: 'var(--gray-100)',
                        borderRadius: 3,
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          position:   'absolute',
                          left:       `${(r.start / (ganttData.length * ganttMonths)) * 100}%`,
                          width:      `${(r.dur   / (ganttData.length * ganttMonths)) * 100}%`,
                          height:     '100%',
                          background: r.cdi < 35 ? '#dc2626' : r.cdi < 55 ? '#ca8a04' : r.cdi < 75 ? '#16a34a' : '#27272a',
                          borderRadius: 3,
                        }}/>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
