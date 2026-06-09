import { createContext, useContext, useState, useEffect } from 'react'

export const ThemeContext = createContext()

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('darkMode')
    return saved !== null ? JSON.parse(saved) : true
  })

  const [is24Hour, setIs24Hour] = useState(() => {
    const saved = localStorage.getItem('is24Hour')
    return saved !== null ? JSON.parse(saved) : false
  })

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(isDark))
    if (isDark) {
      document.documentElement.classList.add('dark-mode')
    } else {
      document.documentElement.classList.remove('dark-mode')
    }
  }, [isDark])

  useEffect(() => {
    localStorage.setItem('is24Hour', JSON.stringify(is24Hour))
  }, [is24Hour])

  const toggleTheme = () => setIsDark(!isDark)
  const toggle24Hour = () => setIs24Hour(!is24Hour)

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, is24Hour, toggle24Hour }}>
      {children}
    </ThemeContext.Provider>
  )
}

