import { createContext, useContext, useState, useCallback } from 'react'

const AuthContext = createContext(null)

// Hardcoded credentials — replace with real API call once Postgres DB is ready
const VALID_USERS = [
  { username: 'admin', password: 'admin', role: 'Administrator', name: 'System Admin' },
]

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
    const match = VALID_USERS.find(
      u => u.username === username.trim() && u.password === password
    )
    if (match) {
      const session = { username: match.username, role: match.role, name: match.name }
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
