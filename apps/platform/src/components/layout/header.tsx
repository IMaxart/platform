import { authClient, useSession } from '@platform/auth/client'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@platform/ui/components/avatar'
import { Badge } from '@platform/ui/components/badge'
import { Button } from '@platform/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@platform/ui/components/dropdown-menu'
import { Separator } from '@platform/ui/components/separator'
import { SidebarTrigger } from '@platform/ui/components/sidebar'
import { ThemeToggle } from '@platform/ui/components/theme-toggle'
import { Link, useNavigate } from '@tanstack/react-router'
import { Globe, Languages, LogOut, Settings } from 'lucide-react'

import * as m from '~/paraglide/messages'
import { getLocale, setLocale } from '~/paraglide/runtime'

const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'pl', label: 'Polski' },
] as const

type HeaderProps = {
  environment?: {
    onChange: (value: null | string) => void
    options: string[]
    value: null | string
  }
  title: string
}

export const Header = ({ environment, title }: HeaderProps) => {
  const { data: session } = useSession()

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
                  {environment.value ?? m.common_allEnvironments()}
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
                {m.common_allEnvironments()}
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
                className={getLocale() === lang.code ? 'bg-accent' : undefined}
                key={lang.code}
                onClick={() => {
                  void setLocale(lang.code)
                }}
              >
                {lang.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <ThemeToggle />

        {session?.user !== undefined ? (
          <UserMenu
            email={session.user.email}
            image={session.user.image}
            name={session.user.name}
          />
        ) : null}
      </div>
    </header>
  )
}

type UserMenuProps = {
  email: string
  image: null | string | undefined
  name: string
}

function UserMenu({ email, image, name }: UserMenuProps) {
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await authClient.signOut()
    await navigate({ to: '/login' })
  }

  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="h-8 w-8 rounded-full p-0" variant="ghost">
          <Avatar className="h-8 w-8">
            {image !== null && image !== undefined ? (
              <AvatarImage alt={name} src={image} />
            ) : null}
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium">{name}</p>
          <p className="text-muted-foreground text-xs">{email}</p>
        </div>
        <DropdownMenuSeparator />
        <Link to="/settings">
          <DropdownMenuItem>
            <Settings className="mr-2 h-4 w-4" />
            {m.common_settings()}
          </DropdownMenuItem>
        </Link>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            void handleSignOut()
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          {m.common_signOut()}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
