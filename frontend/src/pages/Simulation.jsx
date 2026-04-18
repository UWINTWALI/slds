import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useApi, useApiLazy } from '../hooks/useApi'
import { getDistricts, getSectorList, getSimFeatures,
         simulateSingle, simulateBatch, compareInvestments } from '../api/client'
import DataTable from '../components/DataTable'

const FEAT_LABELS = {
  road_density_km_per_km2: 'Road density (km/km²)',
  health_facility_count:   'Health facilities',
  school_count:            'Schools',
  nightlight_mean:         'Night light (electrification)',
  pop_density_mean:        'Population density',
}

const FEAT_MAX = {
  road_density_km_per_km2: 3,
  health_facility_count:   5,
  school_count:            10,
  nightlight_mean:         5,
  pop_density_mean:        300,
}

const FEAT_STEP = {
  road_density_km_per_km2: 0.1,
  health_facility_count:   1,
  school_count:            1,
  nightlight_mean:         0.5,
  pop_density_mean:        50,
}

export default function Simulation() {
  const [tab, setTab] = useState('single')

  // Single sector state
  const [district, setDistrict]   = useState('')
  const [sector,   setSector]     = useState('')
  const [sliders,  setSliders]    = useState({})
  const [simResult, setSimResult] = useState(null)

  // Batch state
  const [batchDistrict, setBatchDistrict] = useState('')
  const [batchSliders,  setBatchSliders]  = useState({})

  // Compare state
  const [cmpDistrict, setCmpDistrict] = useState('')

  const { data: districts }   = useApi(getDistricts)
  const { data: features }    = useApi(getSimFeatures)
  const { data: sectorList }  = useApi(
    () => district ? getSectorList(district) : Promise.resolve([]), [district]
  )

  useEffect(() => { if (districts?.length && !district) setDistrict(districts[0]) }, [districts])
  useEffect(() => { if (sectorList?.length && !sector)  setSector(sectorList[0]) },  [sectorList])

  const { execute: runSingle,  loading: lSingle  } = useApiLazy()
  const { data: batchData,   execute: runBatch,    loading: lBatch   } = useApiLazy()
  const { data: compareData, execute: runCompare,  loading: lCompare } = useApiLazy()

  const activeIntervention = (sliderMap) =>
    Object.fromEntries(Object.entries(sliderMap).filter(([,v]) => v > 0))

  async function handleSingle() {
    const inv = activeIntervention(sliders)
    if (!Object.keys(inv).length) return
    const result = await runSingle(() => simulateSingle(sector, inv))
    if (result) setSimResult(result)
  }

  async function handleBatch() {
    const inv = activeIntervention(batchSliders)
    if (!Object.keys(inv).length) return
    await runBatch(() => simulateBatch(inv, batchDistrict || undefined))
  }

  async function handleCompare() {
    await runCompare(() => compareInvestments(cmpDistrict || undefined))
  }

  const batchCols = ['sector','district','before','after','delta','pct_change']

  return (
    <div className="gap-16">
      <div className="tabs">
        {['single','batch','compare'].map(t => (
          <button key={t} className={`tab ${tab===t?'active':''}`} onClick={()=>setTab(t)}>
            {{ single:'Single Sector', batch:'Batch Ranking', compare:'Investment Comparison' }[t]}
          </button>
        ))}
      </div>

      {/* ── Single sector ── */}
      {tab === 'single' && (
        <div className="grid-2">
          <div className="card">
            <div className="card-title">Configure Intervention</div>

            <div className="form-group">
              <label>District</label>
              <select value={district} onChange={e=>{setDistrict(e.target.value);setSector('');setSimResult(null)}}>
                {districts?.map(d=><option key={d}>{d}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label>Sector</label>
              <select value={sector} onChange={e=>{setSector(e.target.value);setSimResult(null)}}>
                {sectorList?.map(s=><option key={s}>{s}</option>)}
              </select>
            </div>

            <hr className="divider" />
            <div style={{ fontSize:12, fontWeight:500, color:'var(--gray-600)', marginBottom:12 }}>
              What infrastructure to add
            </div>

            {(features ?? []).map(f => (
              <div className="form-group" key={f}>
                <label>{FEAT_LABELS[f] ?? f}</label>
                <div className="range-wrap">
                  <input
                    type="range"
                    min={0}
                    max={FEAT_MAX[f] ?? 10}
                    step={FEAT_STEP[f] ?? 1}
                    value={sliders[f] ?? 0}
                    onChange={e => setSliders(p => ({ ...p, [f]: +e.target.value }))}
                  />
                  <span className="range-value">
                    {sliders[f] ?? 0}
                    {f.includes('density') ? ' km/km²' : f.includes('count') ? '' : ''}
                  </span>
                </div>
              </div>
            ))}

            <button
              className="btn btn-primary"
              style={{ width:'100%', justifyContent:'center', marginTop:8 }}
              onClick={handleSingle}
              disabled={lSingle || !Object.values(sliders).some(v=>v>0)}
            >
              {lSingle ? 'Running…' : '▶  Run Simulation'}
            </button>
          </div>

          <div className="card">
            <div className="card-title">Result</div>

            {!simResult && !lSingle && (
              <div className="empty-state">
                Set at least one slider and click Run Simulation.
              </div>
            )}

            {lSingle && <div className="loading"><div className="spinner"/>Simulating…</div>}

            {simResult && !lSingle && (
              <div>
                <div style={{ fontSize:13, color:'var(--gray-500)', marginBottom:16 }}>
                  Sector: <strong>{simResult.sector}</strong>
                </div>

                <div className="sim-result">
                  <div className="sim-cell">
                    <div className="sim-cell-label">Poverty Before</div>
                    <div className="sim-cell-value">{(simResult.before*100).toFixed(1)}%</div>
                  </div>
                  <div className="sim-cell">
                    <div className="sim-cell-label">Poverty After</div>
                    <div className={`sim-cell-value ${simResult.delta < 0 ? 'improved' : 'worsened'}`}>
                      {(simResult.after*100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="sim-cell">
                    <div className="sim-cell-label">Change</div>
                    <div className={`sim-cell-value ${simResult.delta < 0 ? 'improved' : 'worsened'}`}>
                      {simResult.delta > 0 ? '+' : ''}{(simResult.delta*100).toFixed(2)}pp
                    </div>
                  </div>
                </div>

                <div style={{
                  padding:      '14px 16px',
                  background:   simResult.delta < 0 ? '#f0fdf4' : '#fef2f2',
                  border:       `1px solid ${simResult.delta < 0 ? '#bbf7d0' : '#fecaca'}`,
                  borderRadius: 'var(--radius)',
                  fontSize:     13,
                  marginBottom: 16,
                }}>
                  {simResult.delta < 0
                    ? `✓ This intervention reduces poverty by ${Math.abs(simResult.pct_change).toFixed(1)}% in ${simResult.sector}.`
                    : `✗ No poverty reduction detected with this combination.`
                  }
                </div>

                <div style={{ fontSize:12, fontWeight:500, color:'var(--gray-600)', marginBottom:8 }}>
                  Intervention applied
                </div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Feature</th><th>Added</th></tr></thead>
                    <tbody>
                      {Object.entries(activeIntervention(sliders)).map(([k,v]) => (
                        <tr key={k}>
                          <td style={{ color:'var(--gray-500)' }}>{FEAT_LABELS[k] ?? k}</td>
                          <td style={{ fontWeight:500 }}>+{v}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <a
                  href={`data:text/csv;charset=utf-8,${encodeURIComponent(
                    `Sector,Before,After,Change pp,Pct Change\n${simResult.sector},${(simResult.before*100).toFixed(2)},${(simResult.after*100).toFixed(2)},${(simResult.delta*100).toFixed(4)},${simResult.pct_change}`
                  )}`}
                  download={`sim_${simResult.sector?.replace(/\s+/g,'_')}.csv`}
                  className="btn btn-secondary"
                  style={{ marginTop:14 }}
                >↓ Export result</a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Batch ── */}
      {tab === 'batch' && (
        <div className="grid-2">
          <div className="card">
            <div className="card-title">Batch Configuration</div>

            <div className="form-group">
              <label>Scope (leave blank for all Rwanda)</label>
              <select value={batchDistrict} onChange={e=>setBatchDistrict(e.target.value)}>
                <option value="">All Rwanda</option>
                {districts?.map(d=><option key={d}>{d}</option>)}
              </select>
            </div>

            <hr className="divider" />
            <div style={{ fontSize:12, fontWeight:500, color:'var(--gray-600)', marginBottom:12 }}>
              Intervention to test on all sectors
            </div>

            {(features ?? []).map(f => (
              <div className="form-group" key={f}>
                <label>{FEAT_LABELS[f] ?? f}</label>
                <div className="range-wrap">
                  <input
                    type="range" min={0} max={FEAT_MAX[f]??10} step={FEAT_STEP[f]??1}
                    value={batchSliders[f] ?? 0}
                    onChange={e => setBatchSliders(p => ({ ...p, [f]: +e.target.value }))}
                  />
                  <span className="range-value">{batchSliders[f] ?? 0}</span>
                </div>
              </div>
            ))}

            <button
              className="btn btn-primary"
              style={{ width:'100%', justifyContent:'center', marginTop:8 }}
              onClick={handleBatch}
              disabled={lBatch || !Object.values(batchSliders).some(v=>v>0)}
            >
              {lBatch ? 'Running…' : '▶  Run Batch Simulation'}
            </button>
          </div>

          <div className="card">
            <div className="card-title">Batch Results — Ranked by Impact</div>
            {lBatch && <div className="loading"><div className="spinner"/>Running {batchDistrict || 'national'} simulation…</div>}
            {!batchData && !lBatch && <div className="empty-state">Set an intervention and run the batch simulation.</div>}
            {batchData && !lBatch && (
              <div className="gap-16">
                <div style={{ fontSize:12, color:'var(--gray-500)' }}>
                  Showing top 15 sectors with highest poverty reduction.
                </div>
                <DataTable
                  rows={batchData.slice(0,15).map(r=>({
                    ...r,
                    before: r.before,
                    after:  r.after,
                    delta:  r.delta,
                  }))}
                  columns={batchCols}
                />
                <a
                  href={`data:text/csv;charset=utf-8,${encodeURIComponent(
                    [Object.keys(batchData[0]).join(','), ...batchData.map(r=>Object.values(r).join(','))].join('\n')
                  )}`}
                  download="slds_batch_simulation.csv"
                  className="btn btn-secondary"
                >↓ Export full ranking</a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Compare ── */}
      {tab === 'compare' && (
        <div className="gap-16">
          <div className="card" style={{ padding:'14px 20px' }}>
            <div style={{ display:'flex', alignItems:'flex-end', gap:16 }}>
              <div className="form-group" style={{ marginBottom:0, minWidth:220 }}>
                <label>Scope</label>
                <select value={cmpDistrict} onChange={e=>setCmpDistrict(e.target.value)}>
                  <option value="">All Rwanda</option>
                  {districts?.map(d=><option key={d}>{d}</option>)}
                </select>
              </div>
              <button className="btn btn-primary" onClick={handleCompare} disabled={lCompare}>
                {lCompare ? 'Running…' : '▶  Compare Investment Types'}
              </button>
            </div>
          </div>

          {lCompare && <div className="loading"><div className="spinner"/>Running comparison…</div>}

          {compareData && !lCompare && (
            <>
              {/* Best recommendation */}
              <div className="alert alert-success">
                ✓ Recommended: <strong>{compareData[0]?.intervention_label?.replace(/_/g,' ')}</strong> reduces poverty by{' '}
                <strong>{(compareData[0]?.avg_poverty_reduction*100).toFixed(3)} pp</strong> on average
                {cmpDistrict ? ` in ${cmpDistrict}` : ' across Rwanda'}.
              </div>

              {/* Bar chart */}
              <div className="card">
                <div className="card-title">Average Poverty Reduction by Investment Type</div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart
                    data={compareData.map(r=>({
                      name:  r.intervention_label.replace(/_/g,' '),
                      value: +(r.avg_poverty_reduction*100).toFixed(4),
                    }))}
                    layout="vertical"
                    margin={{ left:120, right:40, top:4, bottom:4 }}
                  >
                    <XAxis type="number" tick={{ fontSize:11 }}
                      label={{ value:'Avg poverty reduction (pp)', position:'insideBottom', offset:-2, fontSize:11 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize:11 }} width={116} />
                    <Tooltip formatter={v=>[`${v} pp`,'Avg reduction']} contentStyle={{ fontSize:12 }} />
                    <Bar dataKey="value" radius={2}>
                      {compareData.map((_,i)=>(
                        <Cell key={i} fill={i===0?'var(--gray-900)':'var(--gray-300)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Detail table */}
              <div className="card">
                <div className="card-title">Detailed Comparison</div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Investment Type</th>
                        <th>Avg Reduction (pp)</th>
                        <th>Max Reduction (pp)</th>
                        <th>Sectors Improved</th>
                        <th>Sectors Worsened</th>
                      </tr>
                    </thead>
                    <tbody>
                      {compareData.map((r,i) => (
                        <tr key={r.intervention_label} className={i===0?'row-selected':''}>
                          <td style={{ fontWeight:500 }}>{r.intervention_label.replace(/_/g,' ')}</td>
                          <td>{(r.avg_poverty_reduction*100).toFixed(4)}</td>
                          <td>{(r.max_poverty_reduction*100).toFixed(4)}</td>
                          <td style={{ color:'var(--success)' }}>{r.sectors_improved}</td>
                          <td style={{ color: r.sectors_worsened>0?'var(--danger)':'var(--gray-400)' }}>{r.sectors_worsened}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <a
                  href={`data:text/csv;charset=utf-8,${encodeURIComponent(
                    [['Investment Type','Avg Reduction','Max Reduction','Improved','Worsened'].join(','),
                     ...compareData.map(r=>[r.intervention_label, r.avg_poverty_reduction, r.max_poverty_reduction, r.sectors_improved, r.sectors_worsened].join(','))
                    ].join('\n')
                  )}`}
                  download={`slds_comparison_${cmpDistrict||'national'}.csv`}
                  className="btn btn-secondary"
                  style={{ marginTop:12 }}
                >↓ Export comparison</a>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
