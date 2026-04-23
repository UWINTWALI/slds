import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

// Attach JWT from localStorage on every request
api.interceptors.request.use(config => {
  try {
    const stored = localStorage.getItem('slds_user')
    const token  = stored ? JSON.parse(stored).token : null
    if (token) config.headers.Authorization = `Bearer ${token}`
  } catch { /* ignore */ }
  return config
})

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
export const getUsers      = ()              => api.get('/users/').then(r => r.data)
export const deactivateUser = (id)           => api.delete(`/users/${id}`).then(r => r.data)
export const activateUser   = (id)           => api.patch(`/users/${id}`, { is_active: true }).then(r => r.data)
export const assignRole     = (id, role_name) => api.post(`/users/${id}/roles`, { role_name }).then(r => r.data)
export const revokeRole     = (id, role_name) => api.delete(`/users/${id}/roles/${role_name}`).then(r => r.data)

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
