import { Moon, Sun } from 'lucide-react'

import { useTheme } from '../providers/theme-provider'
import { Button } from './button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu'

type ThemeLabels = {
  dark: string
  light: string
  system: string
  toggleTheme: string
}

const DEFAULT_LABELS: ThemeLabels = {
  dark: 'Dark',
  light: 'Light',
  system: 'System',
  toggleTheme: 'Toggle theme',
}

type ThemeToggleProps = {
  labels?: Partial<ThemeLabels>
}

export const ThemeToggle = ({ labels }: ThemeToggleProps) => {
  const { setTheme, theme } = useTheme()
  const resolved = { ...DEFAULT_LABELS, ...labels }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="h-8 w-8" size="icon" variant="ghost">
          <Sun className="h-4 w-4 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
          <Moon className="absolute h-4 w-4 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
          <span className="sr-only">{resolved.toggleTheme}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          className={theme === 'light' ? 'bg-accent' : undefined}
          onClick={() => {
            setTheme('light')
          }}
        >
          {resolved.light}
        </DropdownMenuItem>
        <DropdownMenuItem
          className={theme === 'dark' ? 'bg-accent' : undefined}
          onClick={() => {
            setTheme('dark')
          }}
        >
          {resolved.dark}
        </DropdownMenuItem>
        <DropdownMenuItem
          className={theme === 'system' ? 'bg-accent' : undefined}
          onClick={() => {
            setTheme('system')
          }}
        >
          {resolved.system}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
