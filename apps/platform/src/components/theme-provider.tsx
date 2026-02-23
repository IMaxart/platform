import type { ReactNode } from 'react'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'

type Theme = 'dark' | 'light' | 'system'

type ThemeContextValue = {
  setTheme: (theme: Theme) => void
  theme: Theme
}

const ThemeContext = createContext<ThemeContextValue>({
  setTheme: () => undefined,
  theme: 'system',
})

const THEME_KEY = 'analytics-theme'

const getStoredTheme = (): Theme => {
  if (typeof window === 'undefined') return 'system'

  try {
    const stored = localStorage.getItem(THEME_KEY)
    if (stored === 'dark' || stored === 'light' || stored === 'system') {
      return stored
    }
  } catch {
    // localStorage unavailable
  }

  return 'system'
}

const applyTheme = (theme: Theme) => {
  if (typeof window === 'undefined') return

  const root = document.documentElement
  root.classList.remove('light', 'dark')

  const resolved =
    theme === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : theme

  root.classList.add(resolved)
}

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<Theme>(getStoredTheme)

  const updateTheme = useCallback((newTheme: Theme) => {
    setTheme(newTheme)
    applyTheme(newTheme)

    try {
      localStorage.setItem(THEME_KEY, newTheme)
    } catch {
      // localStorage unavailable
    }
  }, [])

  useEffect(() => {
    applyTheme(theme)

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      if (theme === 'system') {
        applyTheme('system')
      }
    }

    media.addEventListener('change', handler)
    return () => {
      media.removeEventListener('change', handler)
    }
  }, [theme])

  return (
    <ThemeContext value={{ setTheme: updateTheme, theme }}>
      {children}
    </ThemeContext>
  )
}

export const useTheme = () => useContext(ThemeContext)
