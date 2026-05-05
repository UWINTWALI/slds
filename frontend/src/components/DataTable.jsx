import { useState } from 'react'

function TierBadge({ tier }) {
  if (!tier || tier === 'nan') return null
  return <span className={`tier-badge tier-${tier}`}>{tier}</span>
}

function fmt(key, val) {
  if (val === null || val === undefined) return '—'
  if (key.includes('poverty') || key.includes('rate')) return `${(val * 100).toFixed(1)}%`
  if (key.includes('density') || key.includes('road'))  return Number(val).toFixed(2)
  if (key.includes('cdi') && !key.includes('rank'))     return Number(val).toFixed(1)
  return String(val)
}

const LABELS = {
  adm3_en:                 'Sector',
  adm2_en:                 'District',
  cdi:                     'CDI',
  cdi_national_rank:       'Nat. Rank',
  cdi_district_rank:       'Dist. Rank',
  tier:                    'Tier',
  predicted_poverty_rate:  'Poverty',
  road_density_km_per_km2: 'Road (km/km²)',
  health_facility_count:   'Health Posts',
  school_count:            'Schools',
  nightlight_mean:         'Night Light',
  gap_from_district:       'Gap vs Dist.',
  is_lagging:              'Lagging',
}

export default function DataTable({ rows = [], columns, highlight, onRowClick, selectedKey, selectedValue }) {
  const [sortCol,  setSortCol]  = useState(null)
  const [sortAsc,  setSortAsc]  = useState(true)

  if (!rows.length) return <div className="empty-state">No data available</div>

  const cols = columns ?? Object.keys(rows[0]).filter(k => k !== 'geometry' && !k.startsWith('Unnamed'))

  const handleSort = col => {
    if (sortCol === col) setSortAsc(a => !a)
    else { setSortCol(col); setSortAsc(true) }
  }

  const sorted = sortCol
    ? [...rows].sort((a, b) => {
        const av = a[sortCol], bv = b[sortCol]
        if (av == null) return 1
        if (bv == null) return -1
        const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv))
        return sortAsc ? cmp : -cmp
      })
    : rows

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {cols.map(c => (
              <th key={c} onClick={() => handleSort(c)}>
                {LABELS[c] ?? c.replace(/_/g, ' ')}
                {sortCol === c ? (sortAsc ? ' ↑' : ' ↓') : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => {
            const isLagging  = row.is_lagging === true
            const isSelected = selectedKey && row[selectedKey] === selectedValue
            const extraCls   = isSelected ? ' row-selected' : isLagging ? ' row-lagging' : ''
            return (
              <tr
                key={i}
                className={extraCls.trim()}
                onClick={() => onRowClick?.(row)}
                style={onRowClick ? { cursor: 'pointer' } : undefined}
              >
                {cols.map(c => (
                  <td key={c}>
                    {c === 'tier'       ? <TierBadge tier={row[c]} />
                   : c === 'is_lagging' ? (row[c] ? <span style={{color:'var(--danger)',fontWeight:500}}>Yes</span> : <span style={{color:'var(--gray-400)'}}>No</span>)
                   : fmt(c, row[c])}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
