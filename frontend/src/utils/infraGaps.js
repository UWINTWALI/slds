/**
 * National thresholds for flagging insufficient social infrastructure.
 * Set from national sector averages (same rule for every district), then rounded
 * to practical values used in column headers.
 */
export const INFRA_THRESHOLDS = {
  roads: { key: 'road_density_km_per_km2', min: 0.3, label: 'Road density', short: 'Roads', unit: 'km/km²' },
  health: { key: 'health_facility_count', min: 2, label: 'Health facilities', short: 'Health', unit: 'facilities' },
  schools: { key: 'school_count', min: 3, label: 'Schools', short: 'Schools', unit: 'schools' },
  electricity: { key: 'nightlight_mean', min: 1.5, label: 'Electricity', short: 'Electricity', unit: 'index' },
}

function formatValue(id, raw) {
  if (raw == null || Number.isNaN(raw)) return '—'
  if (id === 'roads') return Number(raw).toFixed(2)
  if (id === 'electricity') return Number(raw).toFixed(1)
  return String(Math.round(Number(raw)))
}

function formatThresholdHeader(id, min) {
  const m = formatValue(id, min)
  if (id === 'roads') return `≥ ${m} km/km²`
  if (id === 'health') return `≥ ${m} facilities`
  if (id === 'schools') return `≥ ${m} schools`
  if (id === 'electricity') return `≥ ${m} index`
  return `≥ ${m}`
}

/** Copy shown above the underserved sectors table. */
export const INFRA_THRESHOLD_METHODOLOGY = {
  title: 'THRESHOLDS',
  body: [
    'The thresholds are national minimum as the average level of that indicator across all sectors in Rwanda. The same rule applies in every district.',
    ],
}

/** Table column defs — threshold lives in the header, not in each cell. */
export const INFRA_COLUMNS = Object.entries(INFRA_THRESHOLDS).map(([id, cfg]) => ({
  id,
  key: cfg.key,
  header: cfg.short,
  thresholdLabel: formatThresholdHeader(id, cfg.min),
  min: cfg.min,
}))

export function isBelowInfraThreshold(id, value) {
  const cfg = INFRA_THRESHOLDS[id]
  if (!cfg) return false
  return (value ?? 0) < cfg.min
}

export function formatInfraCellValue(id, value) {
  return formatValue(id, value)
}

/**
 * Returns infrastructure items that are below national minimum thresholds.
 */
export function getInfrastructureGaps(sector) {
  if (!sector) return []

  return INFRA_COLUMNS.map(col => {
    const value = sector[col.key] ?? 0
    if (!isBelowInfraThreshold(col.id, value)) return null
    return {
      id: col.id,
      label: INFRA_THRESHOLDS[col.id].label,
      short: col.header,
      value,
      min: col.min,
      displayValue: formatInfraCellValue(col.id, value),
    }
  }).filter(Boolean)
}

export function getCdiTier(cdi) {
  if (cdi == null || Number.isNaN(cdi)) return { label: '—', className: '' }
  if (cdi < 40) return { label: 'Lagging', className: 'cdi-tier--lagging' }
  if (cdi < 55) return { label: 'Developing', className: 'cdi-tier--developing' }
  if (cdi < 75) return { label: 'Progressing', className: 'cdi-tier--progressing' }
  return { label: 'Advanced', className: 'cdi-tier--advanced' }
}
