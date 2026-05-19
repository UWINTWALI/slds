import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  getReports,
  getSector,
  getDistrictSectors,
  getDistrictSummary,
  getMinistryRecipients,
} from '../api/client'
import {
  getSectorReportDocument,
  getDistrictReportDocument,
  senderFromAuthUser,
} from '../utils/reportUtils'
import { submitReportDocument } from '../utils/reportSubmit'
import { IconFileText, IconShare } from '../components/Icons'

const TYPE_LABELS = {
  sector:      'Sector report',
  district:    'District report',
  publication: 'Ministry publication',
}

function reportErrorMessage(e) {
  if (e?.userMessage) return e.userMessage
  const detail = e.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (e.response?.status === 500) {
    return 'Server error while sending the report. Restart the backend (uvicorn) and try again.'
  }
  if (e.message) return e.message
  return 'Submission failed'
}

/* ── Preview modal ── */
function ReportPreviewModal({ html, title, onClose, onConfirm, confirming }) {
  if (!html) return null
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0,0,0,.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: 'min(960px, 100%)',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--gray-200)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Preview before sending</h3>
          <p style={{ fontSize: 12, color: 'var(--gray-500)', margin: '4px 0 0' }}>{title}</p>
        </div>
        <iframe
          title="Report preview"
          srcDoc={html}
          style={{ flex: 1, minHeight: 420, border: 'none', background: '#fff' }}
        />
        <div
          style={{
            padding: '12px 18px',
            borderTop: '1px solid var(--gray-200)',
            display: 'flex',
            gap: 8,
            justifyContent: 'flex-end',
            flexWrap: 'wrap',
          }}
        >
          <button type="button" className="btn btn-secondary" style={{ fontSize: 12 }} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            style={{ fontSize: 12 }}
            disabled={confirming}
            onClick={onConfirm}
          >
            {confirming ? 'Sending…' : 'Confirm & send'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Small helper: the submit-from-reports panel ── */
function SubmitPanel({ role, user, onSubmitted }) {
  const navigate = useNavigate()
  const needsApi = !user?.token || user?.demoMode

  const [sectorData,   setSectorData]   = useState(null)
  const [distSectors,  setDistSectors]  = useState([])
  const [dataReady,    setDataReady]    = useState(false)

  const [ministryList,     setMinistryList]     = useState([])
  const [selectedMinistry, setSelectedMinistry] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [fetchError, setFetchError] = useState(null)
  const [preview, setPreview] = useState(null) // { html, title, doc }
  const [coverNote, setCoverNote] = useState('')

  const sector   = user?.sector
  const district = user?.district

  function reportOptions() {
    return {
      sender: senderFromAuthUser(user),
      coverNote: coverNote.trim(),
    }
  }

  useEffect(() => {
    if (role === 'sector_officer' && sector && district) {
      Promise.all([getSector(sector), getDistrictSectors(district)])
        .then(([sd, ds]) => {
          setSectorData(sd)
          setDistSectors(ds ?? [])
          setDataReady(true)
        })
        .catch(() => setFetchError('Could not load sector data needed to generate the report.'))
    }
    if (role === 'district_officer') {
      getMinistryRecipients()
        .then(list => {
          setMinistryList(list)
          if (list.length > 0) setSelectedMinistry(list[0].id)
          setDataReady(true)
        })
        .catch(() => setFetchError('Could not load ministry recipients.'))
    }
  }, [role, sector, district])

  function buildSectorDoc() {
    return getSectorReportDocument(sectorData, distSectors, sector, district, reportOptions())
  }

  async function buildDistrictDoc() {
    if (!district) return null
    const [summary, sectors] = await Promise.all([
      getDistrictSummary(district),
      getDistrictSectors(district),
    ]).catch(() => [null, []])
    return getDistrictReportDocument(summary, sectors, district, reportOptions())
  }

  async function openPreview() {
    setFetchError(null)
    let doc
    if (role === 'sector_officer') {
      doc = buildSectorDoc()
    } else {
      doc = await buildDistrictDoc()
    }
    if (!doc) {
      setFetchError('Could not build the report. Check that data is loaded.')
      return
    }
    setPreview({
      html: doc.html,
      title: doc.title,
      doc: role === 'district_officer'
        ? { ...doc, target_recipient_id: selectedMinistry || null }
        : doc,
    })
  }

  async function confirmSend() {
    if (!preview?.doc) return
    setSubmitting(true)
    try {
      const res = await submitReportDocument(preview.doc)
      setPreview(null)
      onSubmitted && onSubmitted()
      navigate(`/reports/${res.id}`)
    } catch (e) {
      alert(reportErrorMessage(e))
    } finally {
      setSubmitting(false)
    }
  }

  if (role !== 'sector_officer' && role !== 'district_officer') return null

  return (
    <>
      <div style={{
        background: 'var(--gray-50)',
        border: '1px solid var(--gray-200)',
        borderRadius: 10,
        padding: '18px 20px',
        marginBottom: 20,
      }}>
        {needsApi && (
          <div className="alert alert-warning" style={{ marginBottom: 14, fontSize: 12 }}>
            Reports must be sent through the server. Start the API backend, log out, and sign in
            with your email and password (demo/offline login cannot submit reports).
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <IconShare size={14} color="var(--gray-500)" />
          <span style={{ fontSize: 13, fontWeight: 700 }}>
            {role === 'sector_officer'
              ? `Submit Sector Report to ${district ?? 'District'}`
              : 'Submit District Report to Ministry'}
          </span>
        </div>
        <p style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 14 }}>
          {role === 'sector_officer'
            ? `Preview the official socioeconomic report for ${sector ?? 'your sector'}, then send it to the ${district ?? 'district'} office. The district officer will be notified.`
            : `Preview the district report for ${district ?? 'your district'}, then send it to the selected ministry officer.`}
        </p>

        {fetchError && (
          <p style={{ fontSize: 12, color: '#dc2626', marginBottom: 10 }}>{fetchError}</p>
        )}

        {role === 'district_officer' && ministryList.length > 0 && (
          <div className="form-group" style={{ marginBottom: 14, maxWidth: 400 }}>
            <label style={{ fontSize: 12, marginBottom: 4 }}>Send to Ministry Officer</label>
            <select
              value={selectedMinistry}
              onChange={e => setSelectedMinistry(e.target.value)}
              style={{ fontSize: 12 }}
            >
              {ministryList.map(m => (
                <option key={m.id} value={m.id}>
                  {m.full_name}
                  {m.ministry ? ` — ${m.ministry}` : ''}
                  {m.title   ? ` (${m.title})`     : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {role === 'district_officer' && ministryList.length === 0 && !fetchError && (
          <p style={{ fontSize: 12, color: 'var(--gray-400)', marginBottom: 10 }}>
            No ministry officers are registered yet. Ask your administrator to add national admin users.
          </p>
        )}

        <div className="form-group" style={{ marginBottom: 14, maxWidth: 560 }}>
          <label style={{ fontSize: 12, marginBottom: 4 }}>
            Cover note <span style={{ color: 'var(--gray-400)', fontWeight: 400 }}>(optional)</span>
          </label>
          <textarea
            value={coverNote}
            onChange={e => setCoverNote(e.target.value)}
            rows={3}
            placeholder="Add a short message to appear at the top of the document…"
            style={{ fontSize: 12, width: '100%', resize: 'vertical' }}
          />
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ fontSize: 12 }}
            disabled={!dataReady || !!fetchError}
            onClick={openPreview}
          >
            Preview report
          </button>
          {!dataReady && !fetchError && (
            <span style={{ fontSize: 12, color: 'var(--gray-400)', alignSelf: 'center' }}>
              Loading data…
            </span>
          )}
        </div>
      </div>

      {preview && (
        <ReportPreviewModal
          html={preview.html}
          title={preview.title}
          confirming={submitting}
          onClose={() => !submitting && setPreview(null)}
          onConfirm={confirmSend}
        />
      )}
    </>
  )
}

/* ── Main Reports page ── */
export default function Reports() {
  const { user } = useAuth()
  const role = user?.role

  const [box,     setBox]     = useState('inbox')
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  function loadReports(b) {
    setLoading(true)
    setError(null)
    getReports(b)
      .then(setReports)
      .catch(() => setError('Could not load reports. Is the API running?'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadReports(box) }, [box])

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Reports</h2>
      <p style={{ color: 'var(--gray-500)', fontSize: 13, marginBottom: 20 }}>
        Official submissions with clean PDF documents. Recipients are notified when a report is sent.
      </p>

      <SubmitPanel
        role={role}
        user={user}
        onSubmitted={() => loadReports(box)}
      />

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['inbox', 'sent'].map(tab => (
          <button
            key={tab}
            type="button"
            className={box === tab ? 'btn btn-primary' : 'btn btn-secondary'}
            style={{ fontSize: 12 }}
            onClick={() => setBox(tab)}
          >
            {tab === 'inbox' ? 'Received' : 'Sent'}
          </button>
        ))}
      </div>

      <div className="card">
        {loading && <p style={{ color: 'var(--gray-500)', padding: 12 }}>Loading…</p>}
        {error   && <p className="alert alert-warning">{error}</p>}
        {!loading && !error && reports.length === 0 && (
          <p style={{ color: 'var(--gray-500)', padding: 24, textAlign: 'center' }}>
            No {box === 'inbox' ? 'received' : 'sent'} reports yet.
          </p>
        )}
        {!loading && reports.map(r => (
          <div
            key={r.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 12,
              padding: '14px 0',
              borderBottom: '1px solid var(--gray-200)',
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <IconFileText size={14} />
                <strong style={{ fontSize: 14 }}>{r.title}</strong>
                {!r.read_at && box === 'inbox' && (
                  <span className="badge" style={{ background: '#fff7ed', color: '#c2410c', fontSize: 10 }}>
                    New
                  </span>
                )}
              </div>
              <p style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 4 }}>
                {r.reference_no} · {TYPE_LABELS[r.report_type] || r.report_type}
                {r.district ? ` · ${r.district}` : ''}
                {r.sector   ? ` / ${r.sector}`   : ''}
              </p>
              <p style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>
                {box === 'inbox' ? 'From' : 'By'}: {r.sender?.full_name}
                {' · '}
                {new Date(r.created_at).toLocaleString()}
              </p>
            </div>
            <Link
              to={`/reports/${r.id}`}
              className="btn btn-primary btn-sm"
              style={{ flexShrink: 0, fontSize: 12 }}
            >
              View
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}
