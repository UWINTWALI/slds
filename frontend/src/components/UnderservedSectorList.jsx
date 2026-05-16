import {
  INFRA_COLUMNS,
  INFRA_THRESHOLD_METHODOLOGY,
  getCdiTier,
  isBelowInfraThreshold,
  formatInfraCellValue,
} from '../utils/infraGaps'

function SectorTableRow({ sector, rank }) {
  const tier = getCdiTier(sector.cdi)
  const cdiColor = sector.cdi < 40 ? '#dc2626' : sector.cdi < 55 ? '#ca8a04' : '#16a34a'

  return (
    <tr className="underserved-table-row">
      <td className="underserved-td-rank">#{rank}</td>
      <td className="underserved-td-sector">
        <span className="underserved-sector-name">{sector.adm3_en}</span>
        <span className="underserved-sector-district">{sector.adm2_en}</span>
      </td>
      <td className="underserved-td-cdi">
        <span className="underserved-cdi-value" style={{ color: cdiColor }}>
          {sector.cdi?.toFixed(1) ?? '—'}
        </span>
        {tier.label !== '—' && (
          <span className={`underserved-cdi-tier ${tier.className}`}>{tier.label}</span>
        )}
      </td>
      {INFRA_COLUMNS.map(col => {
        const raw = sector[col.key]
        const below = isBelowInfraThreshold(col.id, raw)
        return (
          <td
            key={col.id}
            className={`underserved-td-infra${below ? ' underserved-td-infra--gap' : ''}`}
            title={below ? `Below minimum (${col.thresholdLabel})` : undefined}
          >
            {formatInfraCellValue(col.id, raw)}
          </td>
        )
      })}
    </tr>
  )
}

/** Table list: thresholds in column headers; cells show values only. */
export default function UnderservedSectorList({
  sectors,
  loading,
  footer,
  emptyMessage,
  scrollMaxHeight = 340,
}) {
  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        Loading…
      </div>
    )
  }

  if (!sectors?.length) {
    return <p className="underserved-empty">{emptyMessage ?? 'No underserved sectors in this view.'}</p>
  }

  return (
    <div className="underserved-list-wrap">
      <div className="underserved-threshold-note">
        <p className="underserved-threshold-note-title">{INFRA_THRESHOLD_METHODOLOGY.title}</p>
        {INFRA_THRESHOLD_METHODOLOGY.body.map((line, i) => (
          <p key={i} className="underserved-threshold-note-body">{line}</p>
        ))}
      </div>

      <p className="underserved-list-intro">
        <strong>CDI score</strong> (0–100) is the overall development index. Red cells are below the
        national minimums in the column headers above.
      </p>

      <div
        className="underserved-scroll-viewport underserved-scroll-viewport--table"
        style={{ '--underserved-scroll-max': `${scrollMaxHeight}px` }}
        tabIndex={0}
        role="region"
        aria-label="Underserved sectors list"
      >
        <table className="underserved-table">
          <thead>
            <tr>
              <th className="underserved-th-rank">#</th>
              <th className="underserved-th-sector">Sector</th>
              <th className="underserved-th-cdi">
                CDI
                <span className="underserved-th-sub">/ 100</span>
              </th>
              {INFRA_COLUMNS.map(col => (
                <th key={col.id} className="underserved-th-infra">
                  {col.header}
                  <span className="underserved-th-sub">{col.thresholdLabel}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sectors.map((s, i) => (
              <SectorTableRow key={s.adm3_en} sector={s} rank={i + 1} />
            ))}
          </tbody>
        </table>
      </div>

      {sectors.length > 2 && (
        <p className="underserved-scroll-hint">Scroll this list to see more sectors</p>
      )}

      {footer && <div className="underserved-list-footer">{footer}</div>}
    </div>
  )
}
