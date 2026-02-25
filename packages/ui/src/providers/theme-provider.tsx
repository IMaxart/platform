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

const THEME_KEY = 'platform-theme'

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

const resolveTheme = (theme: Theme): 'dark' | 'light' => {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
  }
  return theme
}

const applyTheme = (theme: Theme) => {
  if (typeof window === 'undefined') return

  const root = document.documentElement
  root.classList.remove('light', 'dark')
  root.classList.add(resolveTheme(theme))
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

export type { Theme }

export const themeScript = `(function(){var t=localStorage.getItem('${THEME_KEY}')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme:dark)').matches);document.documentElement.classList.add(d?'dark':'light')})();`
