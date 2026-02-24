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
import { useQuery } from '@tanstack/react-query'
import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Building2,
  Check,
  ChevronsUpDown,
  FileText,
  Flag,
  FolderOpen,
  Layers,
  LogOut,
  MousePointerClick,
  Plus,
  Server,
  Settings,
  Users,
} from 'lucide-react'

import { getProjects, getProjectServices } from '~/lib/server/queries'

type NavItemDef = {
  icon: LucideIcon
  label: string
  path: string
}

const parseRouteContext = (pathname: string) => {
  const projectMatch = /\/projects\/([^/]+)/.exec(pathname)
  const serviceMatch = /\/services\/([^/]+)/.exec(pathname)

  return {
    projectId: projectMatch?.[1] ?? null,
    serviceId: serviceMatch?.[1] ?? null,
  }
}

export const AppSidebar = () => {
  const location = useLocation()
  const { data: session } = useSession()
  const { projectId, serviceId } = parseRouteContext(location.pathname)

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-6 py-5">
        <Link className="flex items-center gap-2.5" to="/projects">
          <Layers className="h-5 w-5" />
          <span className="text-lg font-semibold tracking-tight">Platform</span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="pt-2">
        <TeamSwitcher />
        <ProjectSwitcher activeProjectId={projectId} />

        {projectId && (
          <NavSection
            items={[
              {
                icon: FolderOpen,
                label: 'Overview',
                path: `/projects/${projectId}`,
              },
              {
                icon: Server,
                label: 'Services',
                path: `/projects/${projectId}/services`,
              },
              {
                icon: Users,
                label: 'Members',
                path: `/projects/${projectId}/members`,
              },
            ]}
            label="Project"
            pathname={location.pathname}
          />
        )}

        {projectId && (
          <ServiceSwitcher activeServiceId={serviceId} projectId={projectId} />
        )}

        {serviceId && projectId && (
          <NavSection
            items={[
              {
                icon: BarChart3,
                label: 'Analytics',
                path: `/projects/${projectId}/services/${serviceId}`,
              },
              {
                icon: FileText,
                label: 'Pages',
                path: `/projects/${projectId}/services/${serviceId}/pages`,
              },
              {
                icon: MousePointerClick,
                label: 'Events',
                path: `/projects/${projectId}/services/${serviceId}/events`,
              },
              {
                icon: Users,
                label: 'Sessions',
                path: `/projects/${projectId}/services/${serviceId}/sessions`,
              },
              {
                icon: AlertTriangle,
                label: 'Errors',
                path: `/projects/${projectId}/services/${serviceId}/errors`,
              },
              {
                icon: Flag,
                label: 'Feature Flags',
                path: `/projects/${projectId}/services/${serviceId}/flags`,
              },
              {
                icon: Activity,
                label: 'Status',
                path: `/projects/${projectId}/services/${serviceId}/status`,
              },
              {
                icon: Settings,
                label: 'Settings',
                path: `/projects/${projectId}/services/${serviceId}/settings`,
              },
            ]}
            label="Service"
            pathname={location.pathname}
          />
        )}

        <NavSection
          items={[
            { icon: Building2, label: 'Teams', path: '/teams' },
            { icon: Settings, label: 'Settings', path: '/settings' },
          ]}
          label="Account"
          pathname={location.pathname}
        />
      </SidebarContent>
      <SidebarFooter className="border-t p-3">
        {session?.user && (
          <UserMenu email={session.user.email} name={session.user.name} />
        )}
      </SidebarFooter>
    </Sidebar>
  )
}

type NavSectionProps = {
  items: NavItemDef[]
  label: string
  pathname: string
}

type ProjectSwitcherProps = {
  activeProjectId: null | string
}

type ServiceSwitcherProps = {
  activeServiceId: null | string
  projectId: string
}

function NavSection({ items, label, pathname }: NavSectionProps) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-muted-foreground/70 px-3 text-[11px] font-medium tracking-wider uppercase">
        {label}
      </SidebarGroupLabel>
      <SidebarGroupContent className="mt-1">
        <SidebarMenu>
          {items.map((item) => {
            const isExact = item.path === pathname
            const isPrefix =
              pathname.startsWith(item.path) && item.path !== '/settings'
            const isActive = isExact || (isPrefix && item.path.length > 10)

            return (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton
                  asChild
                  className={cn(
                    'transition-all duration-200 ease-out',
                    isActive && 'bg-accent font-medium',
                  )}
                >
                  <Link to={item.path}>
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

function ProjectSwitcher({ activeProjectId }: ProjectSwitcherProps) {
  const { data: activeOrg } = authClient.useActiveOrganization()
  const navigate = useNavigate()

  const { data: projects } = useQuery({
    enabled: !!activeOrg?.id,
    queryFn: () =>
      getProjects({ data: activeOrg ? { teamId: activeOrg.id } : undefined }),
    queryKey: ['projects', activeOrg?.id],
  })

  if (!projects || projects.length === 0) return null

  const activeProject = projects.find((p) => p.id === activeProjectId)

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="w-full justify-between px-3" variant="outline">
              <div className="flex items-center gap-2 truncate">
                <FolderOpen className="h-4 w-4 shrink-0" />
                <span className="truncate text-sm">
                  {activeProject?.name ?? 'Select project'}
                </span>
              </div>
              <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {projects.map((project) => (
              <DropdownMenuItem
                key={project.id}
                onClick={() => {
                  void navigate({ to: `/projects/${project.id}` })
                }}
              >
                <FolderOpen className="mr-2 h-4 w-4" />
                <span className="truncate">{project.name}</span>
                {activeProjectId === project.id && (
                  <Check className="ml-auto h-4 w-4" />
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <Link to="/projects">
              <DropdownMenuItem>
                <Plus className="mr-2 h-4 w-4" />
                All projects
              </DropdownMenuItem>
            </Link>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

function ServiceSwitcher({ activeServiceId, projectId }: ServiceSwitcherProps) {
  const navigate = useNavigate()

  const { data: services } = useQuery({
    queryFn: () => getProjectServices({ data: projectId }),
    queryKey: ['services', projectId],
  })

  if (!services || services.length === 0) return null

  const activeService = services.find((s) => s.id === activeServiceId)

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="w-full justify-between px-3" variant="ghost">
              <div className="flex items-center gap-2 truncate">
                <Server className="h-4 w-4 shrink-0" />
                <span className="truncate text-sm">
                  {activeService?.name ?? 'Select service'}
                </span>
              </div>
              <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {services.map((service) => (
              <DropdownMenuItem
                key={service.id}
                onClick={() => {
                  void navigate({
                    to: `/projects/${projectId}/services/${service.id}`,
                  })
                }}
              >
                <Server className="mr-2 h-4 w-4" />
                <span className="truncate">{service.name}</span>
                {activeServiceId === service.id && (
                  <Check className="ml-auto h-4 w-4" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarGroupContent>
    </SidebarGroup>
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
                Manage teams
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
