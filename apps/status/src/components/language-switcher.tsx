import { Button } from '@platform/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@platform/ui/components/dropdown-menu'
import { Languages } from 'lucide-react'

const LOCALES = [
  { code: 'en', label: 'English' },
  { code: 'pl', label: 'Polski' },
] as const

const getLocale = () => {
  if (typeof document === 'undefined') return 'en'
  const match = /PARAGLIDE_LOCALE=(\w+)/.exec(document.cookie)
  return match?.[1] ?? 'en'
}

const setLocale = (code: string) => {
  document.cookie = `PARAGLIDE_LOCALE=${code};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`
  window.location.reload()
}

const LanguageSwitcher = () => {
  const current = getLocale()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost">
          <Languages className="h-4 w-4" />
          <span className="sr-only">Switch language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LOCALES.map((locale) => (
          <DropdownMenuItem
            className={current === locale.code ? 'font-medium' : ''}
            key={locale.code}
            onClick={() => {
              setLocale(locale.code)
            }}
          >
            {locale.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default LanguageSwitcher
