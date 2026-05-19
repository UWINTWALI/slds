import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

/** JWT from persisted session (required for reports & notifications). */
export function getStoredToken() {
  try {
    const stored = localStorage.getItem('slds_user')
    return stored ? JSON.parse(stored).token : null
  } catch {
    return null
  }
}

// Attach JWT from localStorage on every request
api.interceptors.request.use(config => {
  const token = getStoredToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  r => r,
  err => {
    const status = err.response?.status
    const detail = err.response?.data?.detail
    if (status === 401 && detail === 'Could not validate credentials') {
      err.userMessage =
        'Your session is invalid or expired. Sign out, ensure the API is running, then log in again.'
    }
    return Promise.reject(err)
  },
)

// ── National ──────────────────────────────────────────────────────────────────
export const getNationalSummary  = ()            => api.get('/national/summary').then(r => r.data)
export const getNationalSectors  = (sortBy, ord) => api.get('/national/sectors', { params: { sort_by: sortBy, order: ord } }).then(r => r.data)
export const getNationalGeojson  = ()            => api.get('/national/geojson').then(r => r.data)
export const getModelPerformance = ()            => api.get('/national/model-performance').then(r => r.data)

// ── Districts ─────────────────────────────────────────────────────────────────
export const getDistricts        = ()            => api.get('/districts').then(r => r.data)
export const getDistrictSummary  = (d)           => api.get(`/districts/${encodeURIComponent(d)}/summary`).then(r => r.data)
export const getDistrictSectors  = (d)           => api.get(`/districts/${encodeURIComponent(d)}/sectors`).then(r => r.data)
export const getDistrictGeojson  = (d)           => api.get(`/districts/${encodeURIComponent(d)}/geojson`).then(r => r.data)

// ── Sectors ───────────────────────────────────────────────────────────────────
export const getSector           = (s)           => api.get(`/sectors/${encodeURIComponent(s)}`).then(r => r.data)
export const getSectorNeighbors  = (s)           => api.get(`/sectors/${encodeURIComponent(s)}/neighbors`).then(r => r.data)
export const getSectorList       = (district)    => api.get('/sectors', { params: { district } }).then(r => r.data)

// ── User management (national_admin only) ────────────────────────────────────
// Trailing slashes avoid FastAPI's 307 redirect which strips the Auth header
export const getUsers      = (params = {})   => api.get('/users/', { params }).then(r => r.data)
export const deactivateUser = (id)           => api.patch(`/users/${id}`, { is_active: false }).then(r => r.data)
export const deleteUser     = (id)           => api.delete(`/users/${id}`).then(r => r.data)
export const activateUser   = (id)           => api.patch(`/users/${id}`, { is_active: true }).then(r => r.data)
export const assignRole     = (id, role_name) => api.post(`/users/${id}/roles`, { role_name }).then(r => r.data)
export const revokeRole     = (id, role_name) => api.delete(`/users/${id}/roles/${role_name}`).then(r => r.data)
export const getEmailChangeRequests = ()      => api.get('/users/email-change-requests').then(r => r.data)
export const approveEmailChangeRequest = (id) => api.post(`/users/email-change-requests/${id}/approve`).then(r => r.data)
export const denyEmailChangeRequest = (id)    => api.post(`/users/email-change-requests/${id}/deny`).then(r => r.data)

// ── AI Assistant ──────────────────────────────────────────────────────────────
export const askAssistant = (messages) =>
  api.post('/assistant/chat', { messages }).then(r => r.data)

// ── Simulation ────────────────────────────────────────────────────────────────
export const getSimFeatures      = ()            => api.get('/simulation/features').then(r => r.data)
export const simulateSingle      = (sector, intervention) =>
  api.post('/simulation/single', { sector, intervention }).then(r => r.data)
export const simulateBatch       = (intervention, district) =>
  api.post('/simulation/batch', { intervention, district }).then(r => r.data)
export const compareInvestments  = (district)   =>
  api.post('/simulation/compare', { district }).then(r => r.data)

// ── Reports & notifications ───────────────────────────────────────────────────
export const submitReport = (body) =>
  api.post('/reports', body).then(r => r.data)

export const getReports = (box = 'inbox') =>
  api.get('/reports', { params: { box } }).then(r => r.data)

export const getReport = (id) =>
  api.get(`/reports/${id}`).then(r => r.data)

export const markReportRead = (id) =>
  api.post(`/reports/${id}/read`).then(r => r.data)

export const getReportViewUrl = (id) => `/api/reports/${id}/view`

// Returns list of national_admin users district officers can send reports to
export const getMinistryRecipients = () =>
  api.get('/reports/ministry-recipients').then(r => r.data)

export const getNotifications = (unreadOnly = false) =>
  api.get('/notifications', { params: { unread_only: unreadOnly } }).then(r => r.data)

export const getUnreadNotificationCount = () =>
  api.get('/notifications/unread-count').then(r => r.data)

export const markNotificationRead = (id) =>
  api.post(`/notifications/${id}/read`).then(r => r.data)

