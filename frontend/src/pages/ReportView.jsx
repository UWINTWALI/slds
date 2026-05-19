import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getReport, markReportRead } from '../api/client'
import { IconFileText } from '../components/Icons'

const TYPE_LABELS = {
  sector:      'Sector Report',
  district:    'District Report',
  publication: 'Ministry Publication',
}

function StatusBadge({ status }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 10px',
      borderRadius: 4,
      fontSize: 11,
      fontWeight: 600,
      background: status === 'read' ? 'var(--gray-100)' : '#fff7ed',
      color:      status === 'read' ? 'var(--gray-500)' : '#c2410c',
      border:     `1px solid ${status === 'read' ? 'var(--gray-200)' : '#fdba74'}`,
    }}>
      {status === 'read' ? 'Read' : 'Unread'}
    </span>
  )
}

export default function ReportView() {
  const { id } = useParams()
  const iframeRef = useRef(null)

  const [report,  setReport]  = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    setLoading(true)
    getReport(id)
      .then(r => {
        setReport(r)
        if (r.is_inbox) markReportRead(id).catch(() => {})
      })
      .catch(() => setError('Report not found or access denied.'))
      .finally(() => setLoading(false))
  }, [id])

  /* Print using the iframe's own window (not the app shell) */
  function handlePrint() {
    const frame = iframeRef.current
    if (!frame) return
    try {
      frame.contentWindow.focus()
      frame.contentWindow.print()
    } catch {
      window.print()
    }
  }

  /* Download as HTML blob — user opens it in browser → Print → Save as PDF */
  function handleDownload() {
    if (!report?.html_content) return
    const blob = new Blob([report.html_content], { type: 'text/html;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `${report.reference_no}.html`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  }

  if (loading) return (
    <p style={{ color: 'var(--gray-500)', padding: 24 }}>Loading report…</p>
  )

  if (error || !report) return (
    <div>
      <p className="alert alert-warning">{error}</p>
      <Link to="/reports" className="btn btn-secondary">← Back to reports</Link>
    </div>
  )

  function openFullScreen() {
    if (!report?.html_content) return
    const blob = new Blob([report.html_content], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank', 'noopener,noreferrer')
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Back link */}
      <div>
        <Link to="/reports" style={{ fontSize: 12, color: 'var(--gray-500)' }}>
          ← All reports
        </Link>
      </div>

      {/* Metadata card */}
      <div className="card">
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 16,
          justifyContent: 'space-between', alignItems: 'flex-start',
        }}>
          {/* Left: title + meta */}
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
              <IconFileText size={16} color="var(--gray-400)" />
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>{report.title}</h2>
              <StatusBadge status={report.status} />
            </div>

            <p style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 3 }}>
              <strong>{report.reference_no}</strong>
              {' · '}
              {TYPE_LABELS[report.report_type] ?? report.report_type}
              {report.district ? ` · ${report.district}` : ''}
              {report.sector   ? ` / ${report.sector}`   : ''}
            </p>

            <p style={{ fontSize: 12, color: 'var(--gray-500)' }}>
              {report.is_inbox ? 'From' : 'Sent by'}{' '}
              <strong>{report.sender?.full_name}</strong>
              {report.sender?.title ? ` · ${report.sender.title}` : ''}
              {' · '}
              {new Date(report.created_at).toLocaleString()}
            </p>
          </div>

          {/* Right: action buttons */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Open full screen */}
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
              onClick={openFullScreen}
            >
              ↗ Full Screen
            </button>

            {/* Print → Save as PDF */}
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: 12 }}
              onClick={handlePrint}
            >
              🖨 Print / PDF
            </button>

            {/* Download HTML file */}
            <button
              type="button"
              className="btn btn-primary"
              style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
              onClick={handleDownload}
            >
              ↓ Download
            </button>
          </div>
        </div>
      </div>

      {/* PDF iframe viewer */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <iframe
          ref={iframeRef}
          id={`report-iframe-${id}`}
          title={report.title}
          srcDoc={report.html_content}
          style={{
            width: '100%',
            height: 'min(80vh, 960px)',
            border: 'none',
            background: '#fff',
            display: 'block',
          }}
        />
      </div>

      {/* Download hint */}
      <p style={{ fontSize: 11, color: 'var(--gray-400)', textAlign: 'center' }}>
        To save as PDF: click <strong>Print / PDF</strong> above, then choose <em>Save as PDF</em> in your browser's print dialog.
      </p>

    </div>
  )
}
