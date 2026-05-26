import { useState, useEffect } from 'react'

export function useTheme() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('theme')
      if (stored) return stored === 'dark'
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    } catch {
      return false
    }
  })

  useEffect(() => {
    const root = document.documentElement
    if (isDark) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    try {
      localStorage.setItem('theme', isDark ? 'dark' : 'light')
    } catch { /* localStorage not available */ }
  }, [isDark])

  const toggleTheme = () => setIsDark(v => !v)

  return { isDark, toggleTheme }
}
