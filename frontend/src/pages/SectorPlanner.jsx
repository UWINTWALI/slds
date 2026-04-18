import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
         RadarChart, Radar, PolarGrid, PolarAngleAxis } from 'recharts'
import { useApi } from '../hooks/useApi'
import { getDistricts, getSectorList, getSector, getSectorNeighbors, getDistrictSectors } from '../api/client'
import MetricCard from '../components/MetricCard'
import DataTable from '../components/DataTable'
import ChoroplethMap from '../components/ChoroplethMap'
import { getDistrictGeojson } from '../api/client'

const FEAT = {
  cdi:                     'CDI',
  predicted_poverty_rate:  'Poverty',
  road_density_km_per_km2: 'Roads (km/km²)',
  health_facility_count:   'Health Posts',
  school_count:            'Schools',
  nightlight_mean:         'Night Light',
}

function fmt(key, val) {
  if (val == null) return '—'
  if (key.includes('poverty')) return `${(val*100).toFixed(1)}%`
  if (key === 'cdi')           return val.toFixed(1)
  if (key.includes('density')) return val.toFixed(2)
  return String(val)
}

export default function SectorPlanner() {
  const [district,  setDistrict]  = useState('')
  const [sector,    setSector]    = useState('')

  const { data: districts } = useApi(getDistricts)

  useEffect(() => {
    if (districts?.length && !district) setDistrict(districts[0])
  }, [districts])

  const { data: sectorList } = useApi(
    () => district ? getSectorList(district) : Promise.resolve([]), [district]
  )

  useEffect(() => {
    if (sectorList?.length && !sector) setSector(sectorList[0])
  }, [sectorList])

  const { data: sectorData, loading: ls } = useApi(
    () => sector ? getSector(sector) : Promise.resolve(null), [sector]
  )
  const { data: neighbors,  loading: ln } = useApi(
    () => sector ? getSectorNeighbors(sector) : Promise.resolve([]), [sector]
  )
  const { data: distSectors } = useApi(
    () => district ? getDistrictSectors(district) : Promise.resolve([]), [district]
  )
  const { data: geojson, loading: lm } = useApi(
    () => district ? getDistrictGeojson(district) : Promise.resolve(null), [district]
  )

  const gap = sectorData?.gap_from_district ?? 0
  const distAvg = sectorData?.district_avg_cdi ?? 0

  // Gap analysis data
  const gapData = Object.keys(FEAT).filter(k => k !== 'cdi' && sectorData?.[k] != null).map(k => {
    const sVal = sectorData[k]
    const dAvg = distSectors?.length
      ? distSectors.reduce((s, r) => s + (r[k] ?? 0), 0) / distSectors.length
      : 0
    return { name: FEAT[k], value: +(sVal - dAvg).toFixed(3), sVal, dAvg }
  })

  // Radar data
  const radarKeys = Object.keys(FEAT).filter(k => sectorData?.[k] != null)
  const allVals = k => distSectors?.map(s => s[k]).filter(v => v != null) ?? []
  const norm = (k, v) => {
    const arr = allVals(k)
    const lo = Math.min(...arr), hi = Math.max(...arr)
    return hi === lo ? 0.5 : (v - lo) / (hi - lo)
  }
  const radarData = radarKeys.map(k => ({
    subject: FEAT[k],
    sector:  +norm(k, sectorData?.[k] ?? 0).toFixed(3),
    distAvg: +norm(k, distSectors?.length
      ? distSectors.reduce((s,r)=>s+(r[k]??0),0)/distSectors.length : 0).toFixed(3),
  }))

  const neighborCols = ['adm3_en','adm2_en','cdi','cdi_national_rank',
                        'predicted_poverty_rate','road_density_km_per_km2',
                        'health_facility_count','school_count']

  return (
    <div className="gap-16">
      {/* Selectors */}
      <div className="card" style={{ padding:'14px 20px' }}>
        <div style={{ display:'flex', gap:16, alignItems:'flex-end' }}>
          <div className="form-group" style={{ marginBottom:0, minWidth:200 }}>
            <label>District</label>
            <select value={district} onChange={e => { setDistrict(e.target.value); setSector('') }}>
              {districts?.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom:0, minWidth:200 }}>
            <label>Sector (Umurenge)</label>
            <select value={sector} onChange={e => setSector(e.target.value)}>
              {sectorList?.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      {ls && <div className="loading"><div className="spinner"/>Loading sector…</div>}

      {sectorData && !ls && (
        <>
          {/* Lag alert */}
          {gap < -10
            ? <div className="alert alert-danger">
                ⚠ LAG ALERT — <strong>{sector}</strong> is {Math.abs(gap).toFixed(1)} CDI points below the {district} district average ({distAvg.toFixed(1)}).
                Priority investment is recommended.
              </div>
            : gap < 0
            ? <div className="alert alert-warning">
                {sector} is {Math.abs(gap).toFixed(1)} points below district average. Monitor closely.
              </div>
            : <div className="alert alert-success">
                {sector} is {gap.toFixed(1)} points above district average.
              </div>
          }

          {/* KPIs */}
          <div className="metric-row">
            <MetricCard
              label="CDI Score"
              value={sectorData.cdi?.toFixed(1)}
              delta={`${gap > 0 ? '+' : ''}${gap.toFixed(1)} vs district avg`}
              deltaType={gap >= 0 ? 'positive' : 'negative'}
            />
            <MetricCard label="National Rank"  value={`#${sectorData.cdi_national_rank}`} />
            <MetricCard label="District Rank"  value={`#${sectorData.cdi_district_rank}`} />
            <MetricCard label="Poverty Rate"
              value={sectorData.predicted_poverty_rate != null
                ? `${(sectorData.predicted_poverty_rate*100).toFixed(1)}%` : '—'} />
            <MetricCard label="Road Density"   value={`${(sectorData.road_density_km_per_km2??0).toFixed(2)}`} delta="km/km²" />
            <MetricCard label="Health Posts"   value={sectorData.health_facility_count ?? '—'} />
          </div>

          {/* Map + radar */}
          <div className="grid-2">
            <div className="card">
              <div className="card-title">Location — {district}</div>
              {lm
                ? <div className="loading"><div className="spinner"/>Loading map…</div>
                : <ChoroplethMap geojson={geojson} colorBy="cdi" height={320} />
              }
              <div style={{ fontSize:11, color:'var(--gray-400)', marginTop:6 }}>
                Showing all sectors in {district}. Selected: <strong>{sector}</strong>
              </div>
            </div>

            <div className="card">
              <div className="card-title">Development Profile vs District</div>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="var(--gray-200)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize:11 }} />
                  <Radar name={sector}   dataKey="sector"  stroke="var(--black)"    fill="var(--black)"    fillOpacity={.15} />
                  <Radar name="Dist avg" dataKey="distAvg" stroke="var(--gray-400)" fill="var(--gray-400)" fillOpacity={.08} />
                  <Tooltip contentStyle={{ fontSize:12 }} />
                </RadarChart>
              </ResponsiveContainer>
              <div style={{ fontSize:11, color:'var(--gray-400)', display:'flex', gap:16 }}>
                <span>— {sector}</span>
                <span>— District average</span>
              </div>
            </div>
          </div>

          {/* Gap analysis */}
          <div className="card">
            <div className="card-title">Infrastructure Gap vs District Average</div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={gapData} margin={{ left:80, right:20, top:4, bottom:4 }}>
                <XAxis type="number" tick={{ fontSize:11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize:11 }} width={76} />
                <Tooltip formatter={(v,n,p) => [
                  `${p.payload.sVal != null ? fmt(Object.keys(FEAT).find(k=>FEAT[k]===p.payload.name), p.payload.sVal) : '—'} (this sector) vs ${p.payload.dAvg.toFixed(2)} (avg)`,
                  'Gap',
                ]} contentStyle={{ fontSize:12 }} />
                <Bar dataKey="value" radius={2}>
                  {gapData.map((d,i) => (
                    <Bar key={i} fill={d.value < 0 ? '#dc2626' : '#16a34a'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div style={{ fontSize:11, color:'var(--gray-400)', marginTop:4 }}>
              Negative = below district average. Positive = above.
            </div>
          </div>

          {/* Neighbors */}
          <div className="card">
            <div className="card-title">Neighboring Sectors</div>
            {ln
              ? <div className="loading"><div className="spinner"/>Loading neighbors…</div>
              : neighbors?.length
                ? (
                  <DataTable
                    rows={[
                      { ...sectorData, adm3_en: `${sectorData.adm3_en} ★` },
                      ...(neighbors ?? []),
                    ]}
                    columns={neighborCols}
                    selectedKey="adm3_en"
                    selectedValue={`${sector} ★`}
                  />
                )
                : (
                  <div>
                    <div className="alert alert-info" style={{ marginBottom:12 }}>
                      Neighbor geometry not available — showing 8 closest sectors by CDI in same district.
                    </div>
                    <DataTable
                      rows={[
                        sectorData,
                        ...(distSectors ?? [])
                          .filter(s => s.adm3_en !== sector)
                          .sort((a,b) => Math.abs(a.cdi - sectorData.cdi) - Math.abs(b.cdi - sectorData.cdi))
                          .slice(0, 8),
                      ]}
                      columns={neighborCols}
                      selectedKey="adm3_en"
                      selectedValue={sector}
                    />
                  </div>
                )
            }
          </div>

          {/* Export */}
          <div>
            <a
              href={`data:text/csv;charset=utf-8,${encodeURIComponent(
                ['Field,Value',
                 ...Object.entries({
                   Sector:          sector,
                   District:        district,
                   'CDI Score':     sectorData.cdi?.toFixed(1),
                   'National Rank': `#${sectorData.cdi_national_rank}`,
                   'District Rank': `#${sectorData.cdi_district_rank}`,
                   Tier:            sectorData.tier,
                   'Poverty Rate':  sectorData.predicted_poverty_rate != null ? `${(sectorData.predicted_poverty_rate*100).toFixed(1)}%` : '',
                   'Road Density':  sectorData.road_density_km_per_km2?.toFixed(3),
                   'Health Posts':  sectorData.health_facility_count,
                   Schools:         sectorData.school_count,
                   'Gap vs District': `${gap.toFixed(1)} points`,
                   'Lag Alert':     gap < -10 ? 'YES' : 'No',
                 }).map(([k,v]) => `${k},${v}`)
                ].join('\n')
              )}`}
              download={`slds_request_${sector?.replace(/\s+/g,'_')}.csv`}
              className="btn btn-primary"
            >
              ↓ Export Investment Request Report
            </a>
          </div>
        </>
      )}
    </div>
  )
}
