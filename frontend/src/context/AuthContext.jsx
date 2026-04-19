import { createContext, useContext, useState, useCallback } from 'react'

const AuthContext = createContext(null)

/**
 * Demo users — replace login() body with a real API call once Postgres is ready.
 * Each user carries: role, assigned district/sector, and display name.
 */
export const DEMO_USERS = [
  {
    username:  'admin',
    password:  'admin',
    role:      'national_admin',
    name:      'National Admin',
    title:     'MINALOC / RISA',
    district:  null,
    sector:    null,
  },
  {
    username:  'gasabo',
    password:  'district',
    role:      'district_officer',
    name:      'Gasabo District Office',
    title:     'District Executive Secretary',
    district:  'Gasabo',
    sector:    null,
  },
  {
    username:  'musanze',
    password:  'district',
    role:      'district_officer',
    name:      'Musanze District Office',
    title:     'District Executive Secretary',
    district:  'Musanze',
    sector:    null,
  },
  {
    username:  'rutunga',
    password:  'sector',
    role:      'sector_officer',
    name:      'Rutunga Sector Office',
    title:     'Sector Executive Secretary',
    district:  'Gasabo',
    sector:    'Rutunga',
  },
  {
    username:  'remera',
    password:  'sector',
    role:      'sector_officer',
    name:      'Remera Sector Office',
    title:     'Sector Executive Secretary',
    district:  'Gasabo',
    sector:    'Remera',
  },
  {
    username:  'analyst',
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

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('slds_user')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  const login = useCallback((username, password) => {
    const match = DEMO_USERS.find(
      u => u.username === username.trim() && u.password === password
    )
    if (match) {
      const session = {
        username: match.username,
        role:     match.role,
        name:     match.name,
        title:    match.title,
        district: match.district,
        sector:   match.sector,
      }
      localStorage.setItem('slds_user', JSON.stringify(session))
      setUser(session)
      return { ok: true }
    }
    return { ok: false, error: 'Invalid username or password.' }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('slds_user')
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
