import type { LucideIcon } from 'lucide-react'

import { authClient, useSession } from '@platform/auth/client'
import { cn } from '@platform/ui'
import { Avatar, AvatarFallback } from '@platform/ui/components/avatar'
import { Button } from '@platform/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@platform/ui/components/dropdown-menu'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@platform/ui/components/sidebar'
import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import {
  BarChart3,
  Building2,
  Check,
  ChevronsUpDown,
  FolderOpen,
  LogOut,
  Plus,
  Settings,
} from 'lucide-react'

import * as m from '~/paraglide/messages'

type NavItem = {
  icon: LucideIcon
  key: string
  path: string
}

const NAV_ITEMS: NavItem[] = [
  { icon: BarChart3, key: 'projects', path: '/projects' },
  { icon: Settings, key: 'settings', path: '/settings' },
]

const TEAM_ITEMS: NavItem[] = [
  { icon: Building2, key: 'teams', path: '/teams' },
]

const NAV_LABELS: Record<string, () => string> = {
  projects: () => 'Projects',
  settings: () => m.common_settings(),
  teams: () => 'Teams',
}

export const AppSidebar = () => {
  const location = useLocation()
  const { data: session } = useSession()

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-6 py-5">
        <Link className="flex items-center gap-2.5" to="/projects">
          <FolderOpen className="h-5 w-5" />
          <span className="text-lg font-semibold tracking-tight">Platform</span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="pt-2">
        <TeamSwitcher />

        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground/70 px-3 text-[11px] font-medium tracking-wider uppercase">
            {m.common_dashboard()}
          </SidebarGroupLabel>
          <SidebarGroupContent className="mt-1">
            <SidebarMenu>
              {NAV_ITEMS.map((item) => {
                const isActive =
                  item.path === '/'
                    ? location.pathname === '/'
                    : location.pathname.startsWith(item.path)

                return (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton
                      asChild
                      className={cn(
                        'transition-all duration-200 ease-out',
                        isActive && 'bg-accent font-medium',
                      )}
                    >
                      <Link to={item.path}>
                        <item.icon className="h-4 w-4" />
                        <span>{NAV_LABELS[item.key]?.() ?? item.key}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground/70 px-3 text-[11px] font-medium tracking-wider uppercase">
            Organization
          </SidebarGroupLabel>
          <SidebarGroupContent className="mt-1">
            <SidebarMenu>
              {TEAM_ITEMS.map((item) => {
                const isActive = location.pathname.startsWith(item.path)
                return (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton
                      asChild
                      className={cn(
                        'transition-all duration-200 ease-out',
                        isActive && 'bg-accent font-medium',
                      )}
                    >
                      <Link to={item.path}>
                        <item.icon className="h-4 w-4" />
                        <span>{NAV_LABELS[item.key]?.() ?? item.key}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t p-3">
        {session?.user && (
          <UserMenu email={session.user.email} name={session.user.name} />
        )}
      </SidebarFooter>
    </Sidebar>
  )
}

function TeamSwitcher() {
  const { data: activeOrg } = authClient.useActiveOrganization()
  const { data: orgs } = authClient.useListOrganizations()

  const handleSetActive = async (orgId: string) => {
    await authClient.organization.setActive({ organizationId: orgId })
  }

  if (!orgs || orgs.length === 0) return null

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="w-full justify-between px-3" variant="outline">
              <div className="flex items-center gap-2 truncate">
                <Building2 className="h-4 w-4 shrink-0" />
                <span className="truncate text-sm">
                  {activeOrg?.name ?? 'Select team'}
                </span>
              </div>
              <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {orgs.map((org) => (
              <DropdownMenuItem
                key={org.id}
                onClick={() => {
                  void handleSetActive(org.id)
                }}
              >
                <Building2 className="mr-2 h-4 w-4" />
                <span className="truncate">{org.name}</span>
                {activeOrg?.id === org.id && (
                  <Check className="ml-auto h-4 w-4" />
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <Link to="/teams">
              <DropdownMenuItem>
                <Plus className="mr-2 h-4 w-4" />
                Create team
              </DropdownMenuItem>
            </Link>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

function UserMenu({ email, name }: { email: string; name: string }) {
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
        <Button
          className="h-auto w-full justify-start gap-3 px-2 py-2"
          variant="ghost"
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col items-start truncate">
            <span className="truncate text-sm font-medium">{name}</span>
            <span className="text-muted-foreground truncate text-xs">
              {email}
            </span>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <Link to="/settings">
          <DropdownMenuItem>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </DropdownMenuItem>
        </Link>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            void handleSignOut()
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
