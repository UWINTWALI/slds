import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() =>
    localStorage.getItem('slds_theme') ?? 'light'
  )

  // Apply data-theme to <html> whenever theme changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('slds_theme', theme)
  }, [theme])

  const toggleTheme = useCallback(() =>
    setTheme(t => (t === 'light' ? 'dark' : 'light')), []
  )

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
