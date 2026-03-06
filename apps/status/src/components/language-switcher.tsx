import { Button } from '@platform/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@platform/ui/components/dropdown-menu'
import { Languages } from 'lucide-react'

import * as m from '~/paraglide/messages'

const LOCALE_LABELS: Record<string, () => string> = {
  en: m.locale_en,
  pl: m.locale_pl,
}

const LOCALE_CODES = ['en', 'pl'] as const

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
          <span className="sr-only">{m.switchLanguage()}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LOCALE_CODES.map((code) => (
          <DropdownMenuItem
            className={current === code ? 'font-medium' : ''}
            key={code}
            onClick={() => {
              setLocale(code)
            }}
          >
            {LOCALE_LABELS[code]?.() ?? code}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default LanguageSwitcher
