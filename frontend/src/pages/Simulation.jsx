/**
 * Simulation — Abstract "Scenario Builder" UX.
 * The user never sees a form. They pick a location, then add infrastructure
 * using cards with +/− controls. The system auto-predicts as they type.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useApi, useApiLazy } from '../hooks/useApi'
import { useAuth } from '../context/AuthContext'
import { useRole } from '../hooks/useRole'
import {
  getDistricts, getSectorList, getSector,
  getSimFeatures, simulateSingle, simulateBatch, compareInvestments,
} from '../api/client'
import DataTable from '../components/DataTable'
import {
  IconRoad, IconActivity, IconBookOpen, IconZap, IconUsers,
  IconSliders, IconMap, IconBarChart,
  IconMapPin, IconCheckCircle, IconAlertTriangle, IconLoader, IconTrendingDown, IconInfo,
} from '../components/Icons'

/* ── Infrastructure configuration ───────────────────────────────────────────── */
const INFRA = {
  road_density_km_per_km2: {
    Icon: IconRoad,     label: 'Roads',              unit: 'km/km²',  max: 2.0, step: 0.1,
    color: '#f59e0b',   desc: 'Additional road length per km² of land area',
  },
  health_facility_count: {
    Icon: IconActivity, label: 'Health Facilities',  unit: 'facilities', max: 5, step: 1,
    color: '#ef4444',   desc: 'New health centres, dispensaries or hospitals',
  },
  school_count: {
    Icon: IconBookOpen, label: 'Schools',             unit: 'schools',  max: 8, step: 1,
    color: '#3b82f6',   desc: 'New primary or secondary schools',
  },
  nightlight_mean: {
    Icon: IconZap,      label: 'Electricity Access', unit: 'units',    max: 3.0, step: 0.5,
    color: '#eab308',   desc: 'Improvement in night-light intensity (electrification proxy)',
  },
  pop_density_mean: {
    Icon: IconUsers,    label: 'Population Services',unit: 'k people', max: 200, step: 25,
    color: '#8b5cf6',   desc: 'Population density adjustments (urbanisation)',
  },
}

/* ── Infrastructure card ─────────────────────────────────────────────────────── */
function InfraCard({ featureKey, value, currentVal, onChange }) {
  const cfg = INFRA[featureKey]
  if (!cfg) return null
  const active = value > 0

  return (
    <div className={`infra-card${active ? ' infra-card-active' : ''}`}
      style={{ '--infra-color': cfg.color }}>
      <div className="infra-card-top">
        <div className="infra-card-icon-wrap" style={{
          width: 32, height: 32, borderRadius: 8,
          background: cfg.color + '18',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <cfg.Icon size={16} color={cfg.color} />
        </div>
        <div className="infra-card-meta">
          <div className="infra-card-label">{cfg.label}</div>
          {currentVal != null && (
            <div className="infra-card-current">
              Now: {typeof currentVal === 'number' ? currentVal.toFixed(2) : currentVal} {cfg.unit}
            </div>
          )}
        </div>
        {active && (
          <span className="infra-card-badge" style={{ background: cfg.color + '20', color: cfg.color }}>
            +{value} {cfg.unit}
          </span>
        )}
      </div>

      <div className="infra-card-controls">
        <button
          className="infra-step-btn"
          onClick={() => onChange(Math.max(0, +(value - cfg.step).toFixed(2)))}
          disabled={value <= 0}
        >−</button>
        <input
          type="range" min={0} max={cfg.max} step={cfg.step} value={value}
          className="infra-slider"
          style={{ accentColor: cfg.color }}
          onChange={e => onChange(+e.target.value)}
        />
        <button
          className="infra-step-btn"
          onClick={() => onChange(Math.min(cfg.max, +(value + cfg.step).toFixed(2)))}
        >+</button>
      </div>

      <div className="infra-card-desc">{cfg.desc}</div>
    </div>
  )
}

/* ── Impact panel ────────────────────────────────────────────────────────────── */
function ImpactPanel({ sectorData, result, loading }) {
  const before  = sectorData?.predicted_poverty_rate
  const after   = result?.after
  const delta   = result?.delta

  return (
    <div className="impact-panel">
      <div className="impact-panel-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        {loading
          ? <><IconLoader size={13} /> Calculating…</>
          : result
            ? <><IconTrendingDown size={13} /> Predicted Impact</>
            : <><IconInfo size={13} /> Current Status</>
        }
      </div>

      {before != null && (
        <div className="impact-row">
          <div className="impact-cell">
            <div className="impact-cell-label">Poverty Rate Now</div>
            <div className="impact-cell-val">{(before * 100).toFixed(1)}%</div>
          </div>

          {result && !loading && (
            <>
              <div className="impact-arrow">→</div>
              <div className="impact-cell">
                <div className="impact-cell-label">After Intervention</div>
                <div className={`impact-cell-val ${delta < 0 ? 'impact-good' : 'impact-bad'}`}>
                  {(after * 100).toFixed(1)}%
                </div>
                <div className={`impact-delta ${delta < 0 ? 'impact-good' : 'impact-bad'}`}>
                  {delta < 0 ? '▼' : '▲'} {Math.abs(delta * 100).toFixed(2)} pp
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {sectorData && (
        <div className="impact-meta">
          <div className="impact-meta-row">
            <span>CDI Score</span>
            <strong>{sectorData.cdi?.toFixed(1) ?? '—'} / 100</strong>
          </div>
          <div className="impact-meta-row">
            <span>Development Tier</span>
            <span className={`tier-badge tier-${sectorData.tier}`}>{sectorData.tier ?? '—'}</span>
          </div>
          <div className="impact-meta-row">
            <span>District Rank</span>
            <strong>#{sectorData.cdi_district_rank ?? '—'}</strong>
          </div>
          <div className="impact-meta-row">
            <span>National Rank</span>
            <strong>#{sectorData.cdi_national_rank ?? '—'}</strong>
          </div>
        </div>
      )}

      {!sectorData && !loading && (
        <div style={{ color: 'var(--gray-400)', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>
          Select a district and sector to begin
        </div>
      )}
    </div>
  )
}

/* ── Location selector ───────────────────────────────────────────────────────── */
function LocationBar({ district, setDistrict, sector, setSector, districts, sectorList }) {
  return (
    <div className="sim-location-bar">
      <div className="sim-location-group">
        <label className="sim-loc-label">District</label>
        <select value={district} onChange={e => { setDistrict(e.target.value); setSector('') }}
          className="sim-loc-select">
          <option value="">Select district…</option>
          {districts?.map(d => <option key={d}>{d}</option>)}
        </select>
      </div>
      <div className="sim-location-divider">›</div>
      <div className="sim-location-group">
        <label className="sim-loc-label">Sector</label>
        <select value={sector} onChange={e => setSector(e.target.value)}
          className="sim-loc-select" disabled={!district}>
          <option value="">Select sector…</option>
          {sectorList?.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>
      {district && sector && (
        <div className="sim-location-tag" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <IconMapPin size={13} />
          {sector}, {district}
        </div>
      )}
    </div>
  )
}

/* ── Main component ──────────────────────────────────────────────────────────── */
export default function Simulation() {
  const { user }        = useAuth()
  const { role, isDistrict, isSector } = useRole()
  const [tab, setTab]   = useState('builder')

  // ── Scenario builder state ──
  const [district, setDistrict]   = useState(user?.district ?? '')
  const [sector,   setSector]     = useState(user?.sector   ?? '')
  const [additions, setAdditions] = useState({})   // { feature: addedAmount }
  const [simResult, setSimResult] = useState(null)

  // ── Batch state ──
  const [batchDistrict, setBatchDistrict] = useState(user?.district ?? '')
  const [batchAdditions, setBatchAdditions] = useState({})

  // ── Compare state ──
  const [cmpDistrict, setCmpDistrict] = useState(user?.district ?? '')

  const { data: districts }  = useApi(getDistricts)
  const { data: features }   = useApi(getSimFeatures)
  const { data: sectorList } = useApi(
    () => district ? getSectorList(district) : Promise.resolve([]), [district]
  )
  const { data: sectorData, loading: lSector } = useApi(
    () => sector ? getSector(sector) : Promise.resolve(null), [sector]
  )

  const { execute: runSingle,  loading: lSingle  } = useApiLazy()
  const { data: batchData,    execute: runBatch,    loading: lBatch   } = useApiLazy()
  const { data: compareData,  execute: runCompare,  loading: lCompare } = useApiLazy()

  // Auto-select first district/sector for scoped users
  useEffect(() => {
    if (!district && districts?.length) setDistrict(districts[0])
  }, [districts])
  useEffect(() => {
    if (!sector && sectorList?.length) setSector(sectorList[0])
  }, [sectorList])

  // Debounced auto-predict
  const debounceRef = useRef(null)
  const predict = useCallback(async (sec, adds) => {
    const inv = Object.fromEntries(Object.entries(adds).filter(([,v]) => v > 0))
    if (!sec || !Object.keys(inv).length) { setSimResult(null); return }
    const res = await runSingle(() => simulateSingle(sec, inv))
    if (res) setSimResult(res)
  }, [runSingle])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => predict(sector, additions), 700)
    return () => clearTimeout(debounceRef.current)
  }, [sector, additions, predict])

  function setAdd(feat, val) {
    setAdditions(prev => ({ ...prev, [feat]: val }))
  }
  function setBatchAdd(feat, val) {
    setBatchAdditions(prev => ({ ...prev, [feat]: val }))
  }

  const hasAdditions = Object.values(additions).some(v => v > 0)
  const hasBatchAdds = Object.values(batchAdditions).some(v => v > 0)

  const activeFeatures = features ?? Object.keys(INFRA)

  // Build current vals for display
  const currentVals = sectorData ? {
    road_density_km_per_km2: sectorData.road_density_km_per_km2,
    health_facility_count:   sectorData.health_facility_count,
    school_count:            sectorData.school_count,
    nightlight_mean:         sectorData.nightlight_mean,
    pop_density_mean:        sectorData.pop_density_mean,
  } : {}

  const batchCols = ['sector','district','before','after','delta','pct_change']

  const tabDefs = [
    { key: 'builder',  Icon: IconSliders,  label: 'Scenario Builder'   },
    { key: 'district', Icon: IconMap,      label: 'District Impact'    },
    { key: 'compare',  Icon: IconBarChart, label: 'Strategy Comparison'},
  ]

  return (
    <div className="gap-16">

      {/* ── Tabs ── */}
      <div className="tabs">
        {tabDefs.map(({ key, Icon: TabIcon, label }) => (
          <button key={key} className={`tab ${tab === key ? 'active' : ''}`}
            onClick={() => setTab(key)}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <TabIcon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* ══════════════ SCENARIO BUILDER ══════════════ */}
      {tab === 'builder' && (
        <div className="sim-builder">

          {/* Location bar */}
          <LocationBar
            district={district} setDistrict={d => { setDistrict(d); setSector(''); setSimResult(null); setAdditions({}) }}
            sector={sector}     setSector={s => { setSector(s); setSimResult(null); setAdditions({}) }}
            districts={isDistrict || isSector ? [user.district] : districts}
            sectorList={sectorList}
          />

          {/* Heading */}
          {district && sector && (
            <div className="sim-builder-heading">
              <div className="sim-builder-title">
                What infrastructure would you like to add to <strong>{sector}</strong>?
              </div>
              <div className="sim-builder-sub">
                Adjust the cards below. The predicted poverty impact updates automatically.
              </div>
            </div>
          )}

          <div className="sim-builder-body">
            {/* Infrastructure cards */}
            <div className="sim-infra-grid">
              {activeFeatures.map(feat => (
                <InfraCard
                  key={feat}
                  featureKey={feat}
                  value={additions[feat] ?? 0}
                  currentVal={currentVals[feat]}
                  onChange={val => setAdd(feat, val)}
                />
              ))}
            </div>

            {/* Impact panel — sticky on the right */}
            <div className="sim-impact-col">
              <ImpactPanel
                sectorData={lSector ? null : sectorData}
                result={simResult}
                loading={lSingle}
              />

              {hasAdditions && simResult && !lSingle && (
                <div className="sim-result-verdict" style={{
                  background: simResult.delta < 0 ? '#f0fdf4' : '#fef2f2',
                  borderColor: simResult.delta < 0 ? '#bbf7d0' : '#fecaca',
                  display: 'flex', alignItems: 'flex-start', gap: 8,
                }}>
                  {simResult.delta < 0
                    ? <><IconCheckCircle size={14} color="#16a34a" style={{ marginTop: 1, flexShrink: 0 }} />
                        <span>This intervention reduces poverty by <strong>{Math.abs(simResult.pct_change).toFixed(1)}%</strong> in {simResult.sector}.</span></>
                    : <><IconAlertTriangle size={14} color="#dc2626" style={{ marginTop: 1, flexShrink: 0 }} />
                        <span>No significant poverty reduction with this combination. Try adding more infrastructure.</span></>
                  }
                </div>
              )}

              {hasAdditions && (
                <div className="sim-additions-summary">
                  <div className="sim-additions-title">Planned additions</div>
                  {Object.entries(additions).filter(([,v]) => v > 0).map(([k, v]) => (
                    <div key={k} className="sim-addition-row">
                      <span>{INFRA[k]?.label}</span>
                      <span style={{ fontWeight: 600, color: 'var(--rw-green)' }}>+{v} {INFRA[k]?.unit}</span>
                    </div>
                  ))}
                </div>
              )}

              {simResult && (
                <a
                  href={`data:text/csv;charset=utf-8,${encodeURIComponent(
                    `Sector,Before,After,Change pp,Pct Change\n${simResult.sector},${(simResult.before*100).toFixed(2)},${(simResult.after*100).toFixed(2)},${(simResult.delta*100).toFixed(4)},${simResult.pct_change}`
                  )}`}
                  download={`sim_${simResult.sector?.replace(/\s+/g,'_')}.csv`}
                  className="btn btn-secondary"
                  style={{ marginTop: 8, justifyContent: 'center', textDecoration: 'none' }}
                >↓ Export result</a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ DISTRICT IMPACT ══════════════ */}
      {tab === 'district' && (
        <div className="gap-16">
          <div className="card">
            <div className="card-title">Apply an intervention to all sectors in a district</div>

            <div className="form-group" style={{ maxWidth: 320 }}>
              <label>District scope</label>
              <select value={batchDistrict} onChange={e => setBatchDistrict(e.target.value)}>
                <option value="">All Rwanda</option>
                {districts?.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>

            <div className="sim-infra-grid sim-infra-grid-4">
              {activeFeatures.map(feat => (
                <InfraCard
                  key={feat}
                  featureKey={feat}
                  value={batchAdditions[feat] ?? 0}
                  onChange={val => setBatchAdd(feat, val)}
                />
              ))}
            </div>

            <button
              className="btn btn-primary"
              style={{ marginTop: 16, justifyContent: 'center' }}
              onClick={() => runBatch(() => simulateBatch(
                Object.fromEntries(Object.entries(batchAdditions).filter(([,v]) => v > 0)),
                batchDistrict || undefined
              ))}
              disabled={lBatch || !hasBatchAdds}
            >
              {lBatch ? 'Calculating…' : '▶  Calculate District Impact'}
            </button>
          </div>

          {lBatch && <div className="loading"><div className="spinner"/>Running district simulation…</div>}

          {batchData && !lBatch && (
            <div className="card">
              <div className="card-title">Impact Ranking — Top sectors by poverty reduction</div>
              <div style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 12 }}>
                Showing top 15 most impacted sectors.
              </div>
              <DataTable
                rows={batchData.slice(0, 15)}
                columns={batchCols}
              />
              <a
                href={`data:text/csv;charset=utf-8,${encodeURIComponent(
                  [Object.keys(batchData[0]).join(','), ...batchData.map(r => Object.values(r).join(','))].join('\n')
                )}`}
                download="slds_district_impact.csv"
                className="btn btn-secondary"
                style={{ marginTop: 12, textDecoration: 'none' }}
              >↓ Export full ranking</a>
            </div>
          )}
        </div>
      )}

      {/* ══════════════ STRATEGY COMPARISON ══════════════ */}
      {tab === 'compare' && (
        <div className="gap-16">
          <div className="card" style={{ padding: '14px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
              <div className="form-group" style={{ marginBottom: 0, minWidth: 220 }}>
                <label>Compare strategies for</label>
                <select value={cmpDistrict} onChange={e => setCmpDistrict(e.target.value)}>
                  <option value="">All Rwanda</option>
                  {districts?.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <button className="btn btn-primary" onClick={() => runCompare(() => compareInvestments(cmpDistrict || undefined))}
                disabled={lCompare}>
                {lCompare ? 'Comparing…' : 'Compare All Strategies'}
              </button>
              <div style={{ fontSize: 12, color: 'var(--gray-400)', maxWidth: 300 }}>
                Automatically tests each infrastructure type individually and ranks by poverty reduction impact.
              </div>
            </div>
          </div>

          {lCompare && <div className="loading"><div className="spinner"/>Running comparison across all strategies…</div>}

          {compareData && !lCompare && (
            <>
              <div className="alert alert-success">
                Best strategy: <strong>{compareData[0]?.intervention_label?.replace(/_/g,' ')}</strong> reduces poverty by{' '}
                <strong>{(compareData[0]?.avg_poverty_reduction * 100).toFixed(3)} pp</strong> on average
                {cmpDistrict ? ` in ${cmpDistrict}` : ' across Rwanda'}.
              </div>

              <div className="card">
                <div className="card-title">Average Poverty Reduction by Infrastructure Type</div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={compareData.map(r => ({
                      name: r.intervention_label.replace(/_/g,' '),
                      value: +(r.avg_poverty_reduction * 100).toFixed(4),
                    }))}
                    layout="vertical"
                    margin={{ left: 140, right: 40, top: 4, bottom: 4 }}
                  >
                    <XAxis type="number" tick={{ fontSize: 11 }}
                      label={{ value: 'Avg poverty reduction (pp)', position: 'insideBottom', offset: -2, fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={136} />
                    <Tooltip formatter={v => [`${v} pp`, 'Avg reduction']} contentStyle={{ fontSize: 12 }} />
                    <Bar dataKey="value" radius={2}>
                      {compareData.map((_, i) => (
                        <Cell key={i} fill={i === 0 ? '#00A550' : i === 1 ? '#3b82f6' : 'var(--gray-300)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="card">
                <div className="card-title">Detailed Strategy Comparison</div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Infrastructure Type</th>
                        <th>Avg Reduction (pp)</th>
                        <th>Max Reduction (pp)</th>
                        <th>Sectors Improved</th>
                        <th>Sectors Worsened</th>
                      </tr>
                    </thead>
                    <tbody>
                      {compareData.map((r, i) => (
                        <tr key={r.intervention_label} className={i === 0 ? 'row-selected' : ''}>
                          <td style={{ fontWeight: 700, color: i === 0 ? '#00A550' : 'var(--gray-500)' }}>#{i + 1}</td>
                          <td style={{ fontWeight: 500 }}>{r.intervention_label.replace(/_/g, ' ')}</td>
                          <td>{(r.avg_poverty_reduction * 100).toFixed(4)}</td>
                          <td>{(r.max_poverty_reduction * 100).toFixed(4)}</td>
                          <td style={{ color: 'var(--success)' }}>{r.sectors_improved}</td>
                          <td style={{ color: r.sectors_worsened > 0 ? 'var(--danger)' : 'var(--gray-400)' }}>{r.sectors_worsened}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <a
                  href={`data:text/csv;charset=utf-8,${encodeURIComponent(
                    [['Rank','Investment Type','Avg Reduction','Max Reduction','Improved','Worsened'].join(','),
                     ...compareData.map((r,i) => [i+1, r.intervention_label, r.avg_poverty_reduction, r.max_poverty_reduction, r.sectors_improved, r.sectors_worsened].join(','))
                    ].join('\n')
                  )}`}
                  download={`slds_strategy_comparison_${cmpDistrict||'national'}.csv`}
                  className="btn btn-secondary"
                  style={{ marginTop: 12, textDecoration: 'none' }}
                >↓ Export comparison</a>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
