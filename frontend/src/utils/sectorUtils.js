// Utility functions shared between the sector planner UI and the unit tests.

// Formats a raw API value into a readable string for display.
// Poverty rates become percentages, CDI gets one decimal place,
// and null values show a dash instead of crashing the UI.
export function fmt(key, val) {
  if (val == null)             return '—'
  if (key.includes('poverty')) return `${(val * 100).toFixed(1)}%`
  if (key === 'cdi')           return val.toFixed(1)
  if (key.includes('density')) return val.toFixed(2)
  return String(val)
}

// Normalises a value to a 0 to 1 scale given the min and max of the dataset.
// Used by the radar chart to make all indicators comparable on the same axis.
// Returns 0.5 when all sectors have the same value so the chart still renders.
export function normValue(val, min, max) {
  if (max === min) return 0.5
  return (val - min) / (max - min)
}

// Decides which alert level to show based on how far a sector is below
// its district average. A gap below -10 is a priority lag alert.
export function getLagAlertType(gap) {
  if (gap < -10) return 'danger'
  if (gap < 0)   return 'warning'
  return 'success'
}
