/**
 * reportUtils.js
 * Generates styled printable HTML reports that open in a new window.
 * Users can File > Print > Save as PDF from there.
 */

const BRAND_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    font-size: 13px;
    color: #111;
    background: #fff;
    padding: 0;
  }
  .page { padding: 32px 40px; max-width: 900px; margin: 0 auto; }
  .header {
    display: flex; justify-content: space-between; align-items: flex-start;
    border-bottom: 3px solid #00A550; padding-bottom: 16px; margin-bottom: 24px;
  }
  .header-left h1 { font-size: 22px; color: #00A550; letter-spacing: -.3px; margin-bottom: 4px; }
  .header-left p  { font-size: 12px; color: #666; }
  .header-right   { text-align: right; font-size: 11px; color: #999; line-height: 1.6; }
  .header-right strong { color: #1e3a5f; font-size: 13px; }

  section { margin-bottom: 24px; }
  section h2 {
    font-size: 13px; font-weight: 700; text-transform: uppercase;
    letter-spacing: .07em; color: #1e3a5f;
    border-left: 3px solid #00A550; padding-left: 8px;
    margin-bottom: 12px;
  }

  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  thead th {
    background: #f4f4f5; padding: 8px 12px; text-align: left;
    font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: .05em;
    border-bottom: 1px solid #ddd; color: #555;
  }
  tbody td { padding: 8px 12px; border-bottom: 1px solid #efefef; }
  tbody tr:nth-child(even) td { background: #fafafa; }

  .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 8px; }
  .kpi-box {
    border: 1px solid #e4e4e7; border-radius: 6px; padding: 12px 14px;
    background: #fafafa;
  }
  .kpi-label { font-size: 10px; text-transform: uppercase; letter-spacing: .06em; color: #71717a; margin-bottom: 4px; }
  .kpi-value { font-size: 20px; font-weight: 700; color: #111; }
  .kpi-sub   { font-size: 10px; color: #a1a1aa; margin-top: 2px; }

  .badge {
    display: inline-block; padding: 2px 10px; border-radius: 4px;
    font-size: 11px; font-weight: 700;
  }
  .badge-lagging    { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
  .badge-developing { background: #fffbeb; color: #92400e; border: 1px solid #fde68a; }
  .badge-progressing{ background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
  .badge-advanced   { background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; }
  .badge-warning    { background: #fff7ed; color: #c2410c; border: 1px solid #fdba74; }

  .alert-box {
    padding: 10px 14px; border-radius: 6px; font-size: 12px;
    margin-bottom: 12px; border: 1px solid;
  }
  .alert-danger  { background: #fef2f2; border-color: #fecaca; color: #7f1d1d; }
  .alert-warning { background: #fffbeb; border-color: #fde68a; color: #78350f; }
  .alert-success { background: #f0fdf4; border-color: #bbf7d0; color: #14532d; }

  .bar-wrap { display: flex; align-items: center; gap: 10px; }
  .bar-track { flex: 1; height: 10px; background: #e4e4e7; border-radius: 4px; overflow: hidden; }
  .bar-fill  { height: 100%; border-radius: 4px; }
  .bar-label { font-size: 11px; width: 50px; text-align: right; font-weight: 600; }

  .footer {
    margin-top: 36px; padding-top: 12px; border-top: 1px solid #e4e4e7;
    display: flex; justify-content: space-between;
    font-size: 10px; color: #a1a1aa;
  }

  @media print {
    @page { margin: 18mm 20mm; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none !important; }
  }
`

function tierBadge(tier) {
  if (!tier) return ''
  const cls = `badge-${tier.toLowerCase()}`
  return `<span class="badge ${cls}">${tier}</span>`
}

function pct(v) {
  return v != null ? `${(v * 100).toFixed(1)}%` : '—'
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
        <div class="footer">
          <span>SLDS — Sector-Level Development Simulator · Rwanda 2026</span>
          <span>CBC Team · Generated ${new Date().toLocaleString()}</span>
        </div>
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
export function generateSectorReport(sectorData, distSectors, sector, district) {
  if (!sectorData) return

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
      <div class="header-right">
        <strong>SLDS Platform</strong><br>
        Sector Officer Report<br>
        Prepared for MINALOC / District Office
      </div>
    </div>

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

    <section>
      <h2>Submitted By</h2>
      <table>
        <tbody>
          <tr><td style="color:#888;width:180px">Sector</td><td><strong>${sector}</strong></td></tr>
          <tr><td style="color:#888">District</td><td>${district}</td></tr>
          <tr><td style="color:#888">Report Date</td><td>${new Date().toLocaleDateString('en-RW', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}</td></tr>
          <tr><td style="color:#888">Submitted To</td><td>District Office / MINALOC / MINIFRA</td></tr>
        </tbody>
      </table>
    </section>
  `

  openPrintWindow(`Sector Report — ${sector}`, bodyHTML)
}

/* ─────────────────────────────────────────────────
   DISTRICT OFFICER REPORT  (to MINALOC/MINIFRA)
───────────────────────────────────────────────── */
export function generateDistrictReport(summary, sectors, district) {
  if (!sectors?.length) return

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
        <p>${district} District &nbsp;·&nbsp; ${new Date().toLocaleDateString()} &nbsp;·&nbsp; For submission to MINALOC / MINIFRA</p>
      </div>
      <div class="header-right">
        <strong>SLDS Platform</strong><br>
        District Officer Report<br>
        Official submission document
      </div>
    </div>

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
        The ${district} District Office formally requests MINALOC / MINIFRA to review the above sector data
        and consider targeted infrastructure investments for the sectors identified as lagging.
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

    <section>
      <h2>Submitted By</h2>
      <table>
        <tbody>
          <tr><td style="color:#888;width:200px">District</td><td><strong>${district}</strong></td></tr>
          <tr><td style="color:#888">Report Date</td><td>${new Date().toLocaleDateString('en-RW', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}</td></tr>
          <tr><td style="color:#888">Submitted To</td><td>MINALOC / MINIFRA — National Level</td></tr>
          <tr><td style="color:#888">Platform</td><td>SLDS — Sector-Level Development Simulator v1.0</td></tr>
        </tbody>
      </table>
    </section>
  `

  openPrintWindow(`District Report — ${district}`, bodyHTML)
}

/* ─────────────────────────────────────────────────
   MINISTRY OFFICER — PUBLISH UNDERSERVED LIST
───────────────────────────────────────────────── */
export function generateMinistryPublication(sectors, selectedSectors, assignments) {
  const list = sectors.filter(s => selectedSectors.includes(s.adm3_en))
  if (!list.length) return

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

  openPrintWindow('Ministry Publication — Underserved Sectors', bodyHTML)
}
