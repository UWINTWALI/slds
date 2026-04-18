export default function MetricCard({ label, value, delta, deltaType }) {
  return (
    <div className="metric-card">
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value ?? '—'}</div>
      {delta && (
        <div className={`metric-delta ${deltaType ?? ''}`}>{delta}</div>
      )}
    </div>
  )
}
