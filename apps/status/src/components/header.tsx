import { ThemeToggle } from '@platform/ui/components/theme-toggle'
import { Link } from '@tanstack/react-router'
import { Activity } from 'lucide-react'

import LanguageSwitcher from '~/components/language-switcher'

const Header = () => {
  return (
    <header className="bg-background/80 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 border-b backdrop-blur">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-6 md:px-8">
        <Link
          className="flex items-center gap-2.5 transition-opacity duration-200 hover:opacity-80"
          to="/"
        >
          <Activity aria-hidden className="text-primary h-4.5 w-4.5" />
          <span className="text-sm font-semibold tracking-tight">Status</span>
        </Link>

        <div className="flex items-center gap-1">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}

export default Header
