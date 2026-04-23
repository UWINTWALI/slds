import { createContext, useContext, useState, useCallback } from 'react'

const AuthContext = createContext(null)

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

/**
 * Demo user credentials for the landing page quick-fill buttons.
 * The email field is what the real API expects.
 * Passwords shown here are for display only — the API verifies against bcrypt hashes.
 */
export const DEMO_USERS = [
  {
    username:  'admin',
    email:     'admin@gmail.com',
    password:  'admin',
    role:      'national_admin',
    name:      'National Admin',
    title:     'MINALOC / RISA',
    district:  null,
    sector:    null,
  },
  {
    username:  'gasabo',
    email:     'gasabo@slds.rw',
    password:  'district',
    role:      'district_officer',
    name:      'Gasabo District Office',
    title:     'District Executive Secretary',
    district:  'Gasabo',
    sector:    null,
  },
  {
    username:  'musanze',
    email:     'musanze@slds.rw',
    password:  'district',
    role:      'district_officer',
    name:      'Musanze District Office',
    title:     'District Executive Secretary',
    district:  'Musanze',
    sector:    null,
  },
  {
    username:  'rutunga',
    email:     'rutunga@slds.rw',
    password:  'sector',
    role:      'sector_officer',
    name:      'Rutunga Sector Office',
    title:     'Sector Executive Secretary',
    district:  'Gasabo',
    sector:    'Rutunga',
  },
  {
    username:  'remera',
    email:     'remera@slds.rw',
    password:  'sector',
    role:      'sector_officer',
    name:      'Remera Sector Office',
    title:     'Sector Executive Secretary',
    district:  'Gasabo',
    sector:    'Remera',
  },
  {
    username:  'analyst',
    email:     'analyst@slds.rw',
    password:  'analyst',
    role:      'analyst',
    name:      'Policy Analyst',
    title:     'RISA Research & Planning',
    district:  null,
    sector:    null,
  },
]

export const ROLE_META = {
  national_admin:   { label: 'National Admin',   color: '#09090b', bg: '#f4f4f5', dot: '#09090b', accent: '#09090b' },
  district_officer: { label: 'District Officer', color: '#1e40af', bg: '#eff6ff', dot: '#3b82f6', accent: '#2563eb' },
  sector_officer:   { label: 'Sector Officer',   color: '#166534', bg: '#f0fdf4', dot: '#00A550', accent: '#00A550' },
  analyst:          { label: 'Policy Analyst',   color: '#6d28d9', bg: '#f5f3ff', dot: '#7c3aed', accent: '#7c3aed' },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sessionFromApiUser(apiUser, token) {
  const role = apiUser.roles?.[0] ?? 'analyst'
  return {
    email:    apiUser.email,
    role,
    name:     apiUser.full_name,
    title:    apiUser.title    ?? null,
    district: apiUser.district ?? null,
    sector:   apiUser.sector   ?? null,
    token,
  }
}

/** Fallback: match against the demo list when the API is unreachable. */
function demoLogin(email, password) {
  const match = DEMO_USERS.find(
    u => (u.email === email.trim() || u.username === email.trim()) && u.password === password
  )
  if (!match) return null
  return {
    email:    match.email,
    role:     match.role,
    name:     match.name,
    title:    match.title,
    district: match.district,
    sector:   match.sector,
    token:    null,
  }
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('slds_user')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  /**
   * Async login: tries the real API first, falls back to demo credentials
   * if the API is unreachable (so the UI works before the DB is set up).
   */
  const login = useCallback(async (email, password) => {
    // --- Try the real API ---
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: email.trim(), password }),
      })

      if (res.ok) {
        const data = await res.json()
        const session = sessionFromApiUser(data.user, data.access_token)
        localStorage.setItem('slds_user', JSON.stringify(session))
        setUser(session)
        return { ok: true }
      }

      if (res.status === 401) {
        return { ok: false, error: 'Invalid email or password.' }
      }

      const body = await res.json().catch(() => ({}))
      return { ok: false, error: body.detail ?? 'Login failed. Please try again.' }

    } catch {
      // API unreachable — fall back to demo credentials
      const session = demoLogin(email, password)
      if (session) {
        localStorage.setItem('slds_user', JSON.stringify(session))
        setUser(session)
        return { ok: true }
      }
      return { ok: false, error: 'Invalid email or password.' }
    }
  }, [])

  const logout = useCallback(async () => {
    const token = user?.token
    if (token) {
      try {
        await fetch(`${API_BASE}/api/auth/logout`, {
          method:  'POST',
          headers: { Authorization: `Bearer ${token}` },
        })
      } catch {
        // ignore network errors on logout
      }
    }
    localStorage.removeItem('slds_user')
    setUser(null)
  }, [user])

  /**
   * Register a new non-admin user via the real API.
   * Falls back to a clear error (no demo fallback — registration must persist).
   */
  const register = useCallback(async (payload) => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })

      if (res.ok) return { ok: true }

      const body = await res.json().catch(() => ({}))
      return { ok: false, error: body.detail ?? 'Registration failed. Please try again.' }
    } catch {
      return { ok: false, error: 'Cannot reach the server. Please try again later.' }
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
