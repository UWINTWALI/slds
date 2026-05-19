import { getStoredToken, submitReport as apiSubmitReport } from '../api/client'

/**
 * Submit a report to the platform and notify recipients.
 * @param {object} doc  - Report document produced by getSectorReportDocument / getDistrictReportDocument
 * @returns {Promise<{ id, reference_no, message }>}
 */
export async function submitReportDocument(doc) {
  if (!doc?.html) throw new Error('Report content is missing')

  const token = getStoredToken()
  if (!token) {
    throw new Error(
      'You are not signed in to the server. Start the API (port 8000), log out, and sign in again with your email and password.',
    )
  }

  return apiSubmitReport({
    report_type: doc.reportType,
    title: doc.title,
    district: doc.district ?? null,
    sector: doc.sector ?? null,
    html_content: doc.html,
    payload: doc.payload ?? null,
    target_recipient_id: doc.target_recipient_id ?? null,
  })
}
