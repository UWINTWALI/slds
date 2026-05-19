/**
 * reportUtils.js
 * Generates styled printable HTML reports that open in a new window.
 * Users can File > Print > Save as PDF from there.
 */

const BRAND_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Segoe UI', system-ui, sans-serif;
    font-size: 13px;
    color: #1a1a1a;
    background: #fff;
    line-height: 1.5;
  }
  .page { padding: 36px 44px; max-width: 820px; margin: 0 auto; }

  .header {
    display: flex; justify-content: space-between; align-items: flex-start;
    gap: 20px;
    padding-bottom: 18px; margin-bottom: 22px;
    border-bottom: 1px solid #e8ecef;
  }
  .header-left h1 { font-size: 20px; font-weight: 600; color: #111; letter-spacing: -.02em; margin-bottom: 6px; }
  .header-left p  { font-size: 12px; color: #6b7280; }
  .origin-card {
    text-align: right; font-size: 11px; color: #6b7280; line-height: 1.55;
    padding: 10px 14px; border-radius: 8px;
    background: #f8faf9; border: 1px solid #e5ebe8;
    min-width: 200px;
  }
  .origin-card strong { display: block; color: #111; font-size: 13px; font-weight: 600; margin-bottom: 2px; }
  .origin-card .origin-label { font-size: 9px; text-transform: uppercase; letter-spacing: .08em; color: #9ca3af; margin-bottom: 6px; }

  section { margin-bottom: 22px; }
  section h2 {
    font-size: 11px; font-weight: 600; text-transform: uppercase;
    letter-spacing: .08em; color: #374151;
    padding-bottom: 6px; margin-bottom: 12px;
    border-bottom: 1px solid #eef1f3;
  }

  table { width: 100%; border-collapse: collapse; font-size: 12px; border-radius: 8px; overflow: hidden; border: 1px solid #eef1f3; }
  thead th {
    background: #f6f8f7; padding: 9px 12px; text-align: left;
    font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: .05em;
    color: #4b5563; border-bottom: 1px solid #e5e7eb;
  }
  tbody td { padding: 9px 12px; border-bottom: 1px solid #f0f2f4; }
  tbody tr:last-child td { border-bottom: none; }
  tbody tr:nth-child(even) td { background: #fafbfb; }

  .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 8px; }
  .kpi-box {
    border: 1px solid #eef1f3; border-radius: 8px; padding: 12px 14px;
    background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,.03);
  }
  .kpi-label { font-size: 9px; text-transform: uppercase; letter-spacing: .07em; color: #9ca3af; margin-bottom: 4px; }
  .kpi-value { font-size: 18px; font-weight: 600; color: #111; }
  .kpi-sub   { font-size: 10px; color: #9ca3af; margin-top: 2px; }

  .badge {
    display: inline-block; padding: 2px 8px; border-radius: 4px;
    font-size: 10px; font-weight: 600;
    border: 1px solid #d1d5db; color: #374151; background: #f9fafb;
  }

  .alert-box {
    padding: 10px 14px; font-size: 12px; border-radius: 6px;
    margin-bottom: 12px; background: #f8faf9;
    border: 1px solid #e5ebe8; color: #374151;
  }
  .alert-danger  { border-color: #fecaca; background: #fef8f8; }
  .alert-warning { border-color: #fde68a; background: #fffbeb; }
  .alert-success { border-color: #bbf7d0; background: #f0fdf4; }

  .cover-note {
    padding: 14px 16px; font-size: 12px; line-height: 1.65;
    color: #374151; background: #fafbfb;
    border: 1px solid #e8ecef; border-radius: 8px;
    white-space: pre-wrap;
  }

  .meta-table td:first-child { color: #9ca3af; width: 140px; font-size: 11px; }
  .meta-table td:last-child { color: #111; font-size: 12px; }

  .bar-wrap { display: flex; align-items: center; gap: 10px; }
  .bar-track { flex: 1; height: 6px; background: #eef1f3; border-radius: 3px; overflow: hidden; }
  .bar-fill  { height: 100%; border-radius: 3px; background: #00A550; }
  .bar-label { font-size: 10px; width: 56px; text-align: right; font-weight: 500; color: #6b7280; }

  @media print {
    @page { margin: 16mm 18mm; size: A4; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none !important; }
    .kpi-box { box-shadow: none; }
  }
`

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Build sender profile from logged-in session user. */
export function senderFromAuthUser(user) {
  if (!user) return null
  return {
    fullName: user.name,
    title:    user.title,
    role:     user.role,
    district: user.district,
    sector:   user.sector,
    ministry: user.ministry,
  }
}

function roleLabel(role) {
  const map = {
    sector_officer:   'Sector Office',
    district_officer: 'District Office',
    national_admin:   'Ministry Office',
    analyst:          'Policy Analyst',
  }
  return map[role] ?? 'Office'
}

/** Where the document originates (no destination). */
export function formatDocumentOrigin(sender) {
  if (!sender) return 'Administrative office'
  const parts = []
  if (sender.sector && sender.district) {
    parts.push(`${sender.sector} Sector, ${sender.district} District`)
  } else if (sender.district) {
    parts.push(`${sender.district} District`)
  } else if (sender.ministry) {
    parts.push(sender.ministry)
  }
  parts.push(roleLabel(sender.role))
  return parts.filter(Boolean).join(' · ')
}

function buildCoverNoteSection(coverNote) {
  const text = (coverNote ?? '').trim()
  if (!text) return ''
  return `
    <section>
      <h2>Cover note</h2>
      <div class="cover-note">${escapeHtml(text)}</div>
    </section>
  `
}

function buildIssuerSection(sender) {
  if (!sender?.fullName) return ''
  const dateStr = new Date().toLocaleDateString('en-RW', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
  return `
    <section>
      <h2>Issued by</h2>
      <table class="meta-table">
        <tbody>
          <tr><td>Name</td><td><strong>${escapeHtml(sender.fullName)}</strong></td></tr>
          ${sender.title ? `<tr><td>Title</td><td>${escapeHtml(sender.title)}</td></tr>` : ''}
          <tr><td>Origin</td><td>${escapeHtml(formatDocumentOrigin(sender))}</td></tr>
          <tr><td>Date</td><td>${dateStr}</td></tr>
        </tbody>
      </table>
    </section>
  `
}

function buildOriginCard(sender) {
  if (!sender?.fullName) return ''
  const origin = formatDocumentOrigin(sender)
  const titleLine = sender.title ? `<br>${escapeHtml(sender.title)}` : ''
  return `
    <div class="origin-card">
      <div class="origin-label">Document from</div>
      <strong>${escapeHtml(sender.fullName)}</strong>
      ${titleLine}
      <br>${escapeHtml(origin)}
    </div>
  `
}

function tierBadge(tier) {
  if (!tier) return ''
  const cls = `badge-${tier.toLowerCase()}`
  return `<span class="badge ${cls}">${tier}</span>`
}

function pct(v) {
  return v != null ? `${(v * 100).toFixed(1)}%` : '—'
}

/** Full HTML document for storage / platform viewing */
export function wrapReportDocument(title, bodyHTML) {
  return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>${BRAND_CSS}</style>
    </head>
    <body>
      <div class="page">
        ${bodyHTML}
      </div>
    </body>
    </html>`
}

function openPrintWindow(title, bodyHTML) {
  const win = window.open('', '_blank', 'width=900,height=750')
  if (!win) {
    alert('Please allow pop-ups for this site to generate PDF reports.')
    return
  }
  win.document.write(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>${BRAND_CSS}</style>
    </head>
    <body>
      <div class="page">
        ${bodyHTML}
      </div>
      <div class="no-print" style="position:fixed;bottom:20px;right:20px;display:flex;gap:8px;">
        <button onclick="window.print()"
          style="padding:10px 20px;background:#00A550;color:#fff;border:none;border-radius:6px;font-size:14px;cursor:pointer;font-weight:600;">
          Print / Save as PDF
        </button>
        <button onclick="window.close()"
          style="padding:10px 20px;background:#f4f4f5;color:#333;border:1px solid #ddd;border-radius:6px;font-size:14px;cursor:pointer;">
          Close
        </button>
      </div>
    </body>
    </html>
  `)
  win.document.close()
}

/* ─────────────────────────────────────────────────
   SECTOR OFFICER REPORT
───────────────────────────────────────────────── */
export function buildSectorReportBody(sectorData, distSectors, sector, district, options = {}) {
  if (!sectorData) return null
  const { sender = null, coverNote = '' } = options

  const gap     = sectorData.gap_from_district ?? 0
  const distAvg = sectorData.district_avg_cdi  ?? 0

  const dAvg = key => distSectors?.length
    ? distSectors.reduce((s, r) => s + (r[key] ?? 0), 0) / distSectors.length
    : 0

  const alertClass = gap < -10 ? 'alert-danger' : gap < 0 ? 'alert-warning' : 'alert-success'
  const alertText  = gap < -10
    ? `LAG ALERT: ${sector} is ${Math.abs(gap).toFixed(1)} CDI points below the ${district} district average (${distAvg.toFixed(1)}). Priority investment is recommended.`
    : gap < 0
      ? `${sector} is ${Math.abs(gap).toFixed(1)} points below district average. Monitor closely.`
      : `${sector} is ${gap.toFixed(1)} points above the district average.`

  const infraItems = [
    { label: 'Road Density',       key: 'road_density_km_per_km2', unit: 'km/km²', fmt: v => v.toFixed(2) },
    { label: 'Health Facilities',  key: 'health_facility_count',   unit: '',       fmt: v => Math.round(v) },
    { label: 'Schools',            key: 'school_count',            unit: '',       fmt: v => Math.round(v) },
    { label: 'Electricity Level',  key: 'nightlight_mean',         unit: '',       fmt: v => v.toFixed(1) },
  ]

  const infraRows = infraItems.map(({ label, key, unit, fmt }) => {
    const myVal  = sectorData[key] ?? 0
    const avgVal = dAvg(key)
    const pct    = Math.min(100, avgVal > 0 ? (myVal / (avgVal * 1.5)) * 100 : 50)
    const behind = myVal < avgVal * 0.8
    const color  = behind ? '#dc2626' : '#00A550'
    return `
      <tr>
        <td>${label}</td>
        <td style="font-weight:600">${fmt(myVal)} ${unit}</td>
        <td style="color:#888">${fmt(avgVal)} ${unit}</td>
        <td>
          <div class="bar-wrap">
            <div class="bar-track">
              <div class="bar-fill" style="width:${pct}%;background:${color}"></div>
            </div>
            <span class="bar-label" style="color:${color}">${behind ? 'Below avg' : 'OK'}</span>
          </div>
        </td>
      </tr>
    `
  }).join('')

  const bodyHTML = `
    <div class="header">
      <div class="header-left">
        <h1>Sector Development Report</h1>
        <p>${sector} Sector &nbsp;·&nbsp; ${district} District &nbsp;·&nbsp; ${new Date().toLocaleDateString()}</p>
      </div>
      ${buildOriginCard(sender)}
    </div>

    ${buildCoverNoteSection(coverNote)}

    <section>
      <h2>Development Status</h2>
      <div class="kpi-grid">
        <div class="kpi-box">
          <div class="kpi-label">CDI Score</div>
          <div class="kpi-value">${sectorData.cdi?.toFixed(1) ?? '—'}</div>
          <div class="kpi-sub">out of 100</div>
        </div>
        <div class="kpi-box">
          <div class="kpi-label">Poverty Rate</div>
          <div class="kpi-value">${pct(sectorData.predicted_poverty_rate)}</div>
          <div class="kpi-sub">predicted</div>
        </div>
        <div class="kpi-box">
          <div class="kpi-label">Development Tier</div>
          <div class="kpi-value" style="font-size:15px;margin-top:4px">${tierBadge(sectorData.tier)}</div>
          <div class="kpi-sub">&nbsp;</div>
        </div>
        <div class="kpi-box">
          <div class="kpi-label">National Rank</div>
          <div class="kpi-value">#${sectorData.cdi_national_rank ?? '—'}</div>
          <div class="kpi-sub">of 416 sectors</div>
        </div>
        <div class="kpi-box">
          <div class="kpi-label">District Rank</div>
          <div class="kpi-value">#${sectorData.cdi_district_rank ?? '—'}</div>
          <div class="kpi-sub">in ${district}</div>
        </div>
        <div class="kpi-box">
          <div class="kpi-label">vs District Average</div>
          <div class="kpi-value" style="color:${gap < 0 ? '#dc2626' : '#16a34a'}">${gap > 0 ? '+' : ''}${gap.toFixed(1)}</div>
          <div class="kpi-sub">CDI points</div>
        </div>
      </div>
      <div class="alert-box ${alertClass}">${alertText}</div>
    </section>

    <section>
      <h2>Social Infrastructure Status</h2>
      <table>
        <thead>
          <tr>
            <th>Infrastructure Type</th>
            <th>${sector}</th>
            <th>District Average</th>
            <th>Status vs Average</th>
          </tr>
        </thead>
        <tbody>${infraRows}</tbody>
      </table>
    </section>

    <section>
      <h2>Investment Recommendation</h2>
      <p style="font-size:12px;color:#444;line-height:1.7;margin-bottom:12px;">
        Based on the infrastructure gap analysis, the following investments are recommended
        for <strong>${sector}</strong> sector to improve the CDI score and reduce poverty:
      </p>
      <table>
        <thead>
          <tr><th>Infrastructure</th><th>Current Level</th><th>District Average</th><th>Priority</th></tr>
        </thead>
        <tbody>
          ${infraItems.map(({ label, key, fmt }) => {
            const myVal  = sectorData[key] ?? 0
            const avgVal = dAvg(key)
            const behind = myVal < avgVal * 0.8
            return `<tr>
              <td>${label}</td>
              <td>${fmt(myVal)}</td>
              <td>${fmt(avgVal)}</td>
              <td>${behind ? '<span class="badge badge-warning">High Priority</span>' : '<span class="badge badge-progressing">Monitor</span>'}</td>
            </tr>`
          }).join('')}
        </tbody>
      </table>
    </section>

    ${buildIssuerSection(sender)}
  `

  return bodyHTML
}

export function getSectorReportDocument(sectorData, distSectors, sector, district, options = {}) {
  const body = buildSectorReportBody(sectorData, distSectors, sector, district, options)
  if (!body) return null
  const title = `Sector Report — ${sector}`
  const coverNote = (options.coverNote ?? '').trim()
  return {
    title,
    html: wrapReportDocument(title, body),
    reportType: 'sector',
    district,
    sector,
    payload: coverNote ? { cover_note: coverNote } : null,
  }
}

export function generateSectorReport(sectorData, distSectors, sector, district, options = {}) {
  const body = buildSectorReportBody(sectorData, distSectors, sector, district, options)
  if (!body) return
  openPrintWindow(`Sector Report — ${sector}`, body)
}

/* ─────────────────────────────────────────────────
   DISTRICT OFFICER REPORT  (to MINALOC/MINIFRA)
───────────────────────────────────────────────── */
export function buildDistrictReportBody(summary, sectors, district, options = {}) {
  if (!sectors?.length) return null
  const { sender = null, coverNote = '' } = options

  const ranked  = [...sectors].sort((a, b) => a.cdi - b.cdi)
  const lagging = sectors.filter(s => s.is_lagging)

  function getMissing(s) {
    const m = []
    if ((s.road_density_km_per_km2 ?? 0) < 0.3) m.push('Roads')
    if ((s.health_facility_count   ?? 0) < 2)    m.push('Health Facilities')
    if ((s.school_count            ?? 0) < 3)    m.push('Schools')
    if ((s.nightlight_mean         ?? 0) < 1.5)  m.push('Electricity')
    return m
  }

  const sectorRows = ranked.map((s, i) => {
    const missing = getMissing(s)
    return `
      <tr>
        <td style="color:#888">#${i + 1}</td>
        <td style="font-weight:500">${s.adm3_en}</td>
        <td>${s.cdi?.toFixed(1) ?? '—'}</td>
        <td>${tierBadge(s.tier)}</td>
        <td>${pct(s.predicted_poverty_rate)}</td>
        <td>${missing.length > 0 ? missing.join(', ') : '—'}</td>
      </tr>
    `
  }).join('')

  const bodyHTML = `
    <div class="header">
      <div class="header-left">
        <h1>District Development Report</h1>
        <p>${district} District · ${new Date().toLocaleDateString()}</p>
      </div>
      ${buildOriginCard(sender)}
    </div>

    ${buildCoverNoteSection(coverNote)}

    <section>
      <h2>District Summary</h2>
      <div class="kpi-grid">
        <div class="kpi-box"><div class="kpi-label">Total Sectors</div><div class="kpi-value">${summary?.n_sectors ?? sectors.length}</div></div>
        <div class="kpi-box"><div class="kpi-label">Average CDI</div><div class="kpi-value">${summary?.avg_cdi?.toFixed(1) ?? '—'}</div><div class="kpi-sub">out of 100</div></div>
        <div class="kpi-box"><div class="kpi-label">Lagging Sectors</div><div class="kpi-value" style="color:#dc2626">${lagging.length}</div><div class="kpi-sub">need intervention</div></div>
        <div class="kpi-box"><div class="kpi-label">Avg Poverty Rate</div><div class="kpi-value">${pct(summary?.avg_poverty)}</div></div>
        <div class="kpi-box"><div class="kpi-label">Best Sector</div><div class="kpi-value" style="font-size:14px;color:#16a34a">${summary?.best_sector ?? '—'}</div></div>
        <div class="kpi-box"><div class="kpi-label">Needs Attention</div><div class="kpi-value" style="font-size:14px;color:#dc2626">${summary?.worst_sector ?? '—'}</div></div>
      </div>
    </section>

    ${lagging.length > 0 ? `
    <section>
      <h2>Lagging Sectors — Immediate Intervention Required</h2>
      <div class="alert-box alert-danger">
        ${lagging.length} sector(s) in ${district} are more than 10 CDI points below district average and require immediate infrastructure investment:
        <strong>${lagging.map(s => s.adm3_en).join(', ')}</strong>.
      </div>
    </section>` : ''}

    <section>
      <h2>Full Sector Ranking with Infrastructure Gaps</h2>
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Sector</th>
            <th>CDI</th>
            <th>Tier</th>
            <th>Poverty Rate</th>
            <th>Missing Infrastructure</th>
          </tr>
        </thead>
        <tbody>${sectorRows}</tbody>
      </table>
    </section>

    <section>
      <h2>Investment Request</h2>
      <p style="font-size:12px;color:#444;line-height:1.7;">
        The above sector data is presented for review, with targeted infrastructure investments
        recommended for the sectors identified as lagging.
        Specifically, the following infrastructure types are critically missing in the underserved areas.
      </p>
      <table>
        <thead><tr><th>Infrastructure Type</th><th>Sectors Affected</th></tr></thead>
        <tbody>
          ${['Roads','Health Facilities','Schools','Electricity'].map(type => {
            const affected = ranked.filter(s => getMissing(s).includes(type)).map(s => s.adm3_en)
            return affected.length ? `<tr><td>${type}</td><td>${affected.join(', ')}</td></tr>` : ''
          }).join('')}
        </tbody>
      </table>
    </section>

    ${buildIssuerSection(sender)}
  `

  return bodyHTML
}

export function getDistrictReportDocument(summary, sectors, district, options = {}) {
  const body = buildDistrictReportBody(summary, sectors, district, options)
  if (!body) return null
  const title = `District Report — ${district}`
  const coverNote = (options.coverNote ?? '').trim()
  return {
    title,
    html: wrapReportDocument(title, body),
    reportType: 'district',
    district,
    sector: null,
    payload: coverNote ? { cover_note: coverNote } : null,
  }
}

export function generateDistrictReport(summary, sectors, district, options = {}) {
  const body = buildDistrictReportBody(summary, sectors, district, options)
  if (!body) return
  openPrintWindow(`District Report — ${district}`, body)
}

/* ─────────────────────────────────────────────────
   MINISTRY OFFICER — PUBLISH UNDERSERVED LIST
───────────────────────────────────────────────── */
export function buildMinistryPublicationBody(sectors, selectedSectors, assignments) {
  const list = sectors.filter(s => selectedSectors.includes(s.adm3_en))
  if (!list.length) return null

  const rows = list.map(s => `
    <tr>
      <td style="font-weight:500">${s.adm3_en}</td>
      <td>${s.adm2_en}</td>
      <td>${s.cdi?.toFixed(1) ?? '—'}</td>
      <td>${tierBadge(s.tier)}</td>
      <td>${pct(s.predicted_poverty_rate)}</td>
      <td><strong style="color:#1d4ed8">${assignments[s.adm3_en] ?? 'To be assigned'}</strong></td>
    </tr>
  `).join('')

  const bodyHTML = `
    <div class="header">
      <div class="header-left">
        <h1>Official Publication — Underserved Sectors</h1>
        <p>Ministry of Local Government (MINALOC) &nbsp;·&nbsp; ${new Date().toLocaleDateString()}</p>
      </div>
      <div class="header-right">
        <strong>Republic of Rwanda</strong><br>
        Ministry Publication<br>
        SLDS Infrastructure Allocation
      </div>
    </div>

    <section>
      <h2>Notice of Infrastructure Allocation</h2>
      <p style="font-size:12px;color:#444;line-height:1.8;margin-bottom:14px;">
        The following sectors have been identified through the Sector-Level Development Simulator (SLDS)
        as underserved in key social infrastructure. In accordance with national development priorities,
        the Ministry hereby announces the following infrastructure allocation for the listed sectors.
      </p>
    </section>

    <section>
      <h2>Designated Sectors for Infrastructure Investment</h2>
      <table>
        <thead>
          <tr>
            <th>Sector</th>
            <th>District</th>
            <th>CDI Score</th>
            <th>Current Tier</th>
            <th>Poverty Rate</th>
            <th>Assigned Infrastructure</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </section>

    <section>
      <h2>Implementation Notes</h2>
      <p style="font-size:12px;color:#444;line-height:1.8;">
        District development officers are instructed to coordinate with sector executive secretaries
        to facilitate implementation. Progress reports should be submitted quarterly via the SLDS platform.
      </p>
    </section>
  `

  return bodyHTML
}

export function getMinistryPublicationDocument(sectors, selectedSectors, assignments) {
  const body = buildMinistryPublicationBody(sectors, selectedSectors, assignments)
  if (!body) return null
  const title = 'Ministry Publication — Underserved Sectors'
  const list = sectors.filter(s => selectedSectors.includes(s.adm3_en))
  return {
    title,
    html: wrapReportDocument(title, body),
    reportType: 'publication',
    district: null,
    sector: null,
    payload: {
      sector_names: selectedSectors,
      sectors: list.map(s => ({ adm3_en: s.adm3_en, district: s.adm2_en })),
      assignments,
    },
  }
}

export function generateMinistryPublication(sectors, selectedSectors, assignments) {
  const body = buildMinistryPublicationBody(sectors, selectedSectors, assignments)
  if (!body) return
  openPrintWindow('Ministry Publication — Underserved Sectors', body)
}
