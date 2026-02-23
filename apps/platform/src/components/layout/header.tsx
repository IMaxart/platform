import { Globe, Languages, Moon, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { useTheme } from '~/components/theme-provider'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { Separator } from '~/components/ui/separator'
import { SidebarTrigger } from '~/components/ui/sidebar'
import { setLanguage, SUPPORTED_LANGUAGES } from '~/i18n/config'

type HeaderProps = {
  environment?: {
    onChange: (value: null | string) => void
    options: string[]
    value: null | string
  }
  title: string
}

export const Header = ({ environment, title }: HeaderProps) => {
  const { setTheme, theme } = useTheme()
  const { i18n, t } = useTranslation()

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger />
      <Separator className="mr-2 h-4" orientation="vertical" />
      <h1 className="text-sm font-medium">{title}</h1>
      <div className="ml-auto flex items-center gap-1">
        {environment && environment.options.length > 1 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="h-8 gap-1.5" size="sm" variant="outline">
                <Globe className="h-3.5 w-3.5" />
                <span className="text-xs">
                  {environment.value ?? t('common.allEnvironments')}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className={environment.value === null ? 'bg-accent' : undefined}
                onClick={() => {
                  environment.onChange(null)
                }}
              >
                {t('common.allEnvironments')}
              </DropdownMenuItem>
              {environment.options.map((env) => (
                <DropdownMenuItem
                  className={
                    environment.value === env ? 'bg-accent' : undefined
                  }
                  key={env}
                  onClick={() => {
                    environment.onChange(env)
                  }}
                >
                  <Badge className="mr-1.5" variant="outline">
                    {env}
                  </Badge>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="h-8 w-8" size="icon" variant="ghost">
              <Languages className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {SUPPORTED_LANGUAGES.map((lang) => (
              <DropdownMenuItem
                className={
                  i18n.language === lang.code ? 'bg-accent' : undefined
                }
                key={lang.code}
                onClick={() => {
                  setLanguage(lang.code)
                }}
              >
                {lang.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="h-8 w-8" size="icon" variant="ghost">
              <Sun className="h-4 w-4 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
              <Moon className="absolute h-4 w-4 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className={theme === 'light' ? 'bg-accent' : undefined}
              onClick={() => {
                setTheme('light')
              }}
            >
              Light
            </DropdownMenuItem>
            <DropdownMenuItem
              className={theme === 'dark' ? 'bg-accent' : undefined}
              onClick={() => {
                setTheme('dark')
              }}
            >
              Dark
            </DropdownMenuItem>
            <DropdownMenuItem
              className={theme === 'system' ? 'bg-accent' : undefined}
              onClick={() => {
                setTheme('system')
              }}
            >
              System
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
