import { authClient } from '@platform/auth/client'
import { cn } from '@platform/ui'
import { SearchableSwitcher } from '@platform/ui/components/searchable-switcher'
import {
  Sidebar,
  SidebarContent,
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
import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Building2,
  FileText,
  Flag,
  FolderOpen,
  Layers,
  MousePointerClick,
  Plus,
  Server,
  Settings,
  Users,
} from 'lucide-react'

import { getProjects, getProjectServices } from '~/lib/server/queries'
import * as m from '~/paraglide/messages'

type NavItemDef = {
  disabled?: boolean
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
  const { data: activeOrg } = authClient.useActiveOrganization()
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

        {activeOrg ? (
          <NavSection
            items={[
              {
                icon: FolderOpen,
                label: m.common_projects(),
                path: '/projects',
              },
              {
                icon: Users,
                label: m.common_members(),
                path: `/teams/${activeOrg.id}/members`,
              },
            ]}
            label={m.sidebar_teamSection()}
            pathname={location.pathname}
          />
        ) : null}

        <ProjectSwitcher activeProjectId={projectId} />

        {projectId !== null ? (
          <NavSection
            items={[
              {
                icon: FolderOpen,
                label: m.common_overview(),
                path: `/projects/${projectId}`,
              },
              {
                icon: Server,
                label: m.common_services(),
                path: `/projects/${projectId}/services`,
              },
              {
                icon: Users,
                label: m.common_members(),
                path: `/projects/${projectId}/members`,
              },
            ]}
            label={m.common_project()}
            pathname={location.pathname}
          />
        ) : null}

        {projectId !== null ? (
          <ServiceSwitcher activeServiceId={serviceId} projectId={projectId} />
        ) : null}

        {serviceId !== null && projectId !== null ? (
          <ServiceNavSection
            pathname={location.pathname}
            projectId={projectId}
            serviceId={serviceId}
          />
        ) : null}

        <NavSection
          items={[{ icon: Building2, label: m.common_teams(), path: '/teams' }]}
          label={null}
          pathname={location.pathname}
        />
      </SidebarContent>
    </Sidebar>
  )
}

type NavSectionProps = {
  items: NavItemDef[]
  label: null | string
  pathname: string
}

type ProjectSwitcherProps = {
  activeProjectId: null | string
}

type ServiceNavSectionProps = {
  pathname: string
  projectId: string
  serviceId: string
}

type ServiceSwitcherProps = {
  activeServiceId: null | string
  projectId: string
}

function NavSection({ items, label, pathname }: NavSectionProps) {
  return (
    <SidebarGroup>
      {label !== null ? (
        <SidebarGroupLabel className="text-muted-foreground/70 px-3 text-[11px] font-medium tracking-wider uppercase">
          {label}
        </SidebarGroupLabel>
      ) : null}
      <SidebarGroupContent className={label !== null ? 'mt-1' : undefined}>
        <SidebarMenu>
          {items.map((item) => {
            if (item.disabled === true) return null

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
                    isActive ? 'bg-accent font-medium' : undefined,
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

  const teamId = activeOrg?.id
  const { data: projects } = useQuery({
    enabled: teamId !== undefined,
    queryFn: () =>
      getProjects({
        data: teamId !== undefined ? { teamId } : undefined,
      }),
    queryKey: ['projects', teamId],
  })

  if (!projects || projects.length === 0) return null

  const items = projects.map((p) => ({ id: p.id, label: p.name }))

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SearchableSwitcher
          footer={
            <Link
              className="hover:bg-accent flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden"
              to="/projects"
            >
              <Plus className="h-4 w-4 shrink-0" />
              {m.sidebar_allProjects()}
            </Link>
          }
          items={items}
          noResultsText={m.sidebar_noResults()}
          onSelect={(id) => {
            void navigate({ to: `/projects/${id}` })
          }}
          placeholder={m.sidebar_selectProject()}
          searchPlaceholder={m.common_search()}
          triggerIcon={<FolderOpen className="h-4 w-4" />}
          value={activeProjectId}
        />
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

function ServiceNavSection({
  pathname,
  projectId,
  serviceId,
}: ServiceNavSectionProps) {
  const { data: services } = useQuery({
    queryFn: () => getProjectServices({ data: projectId }),
    queryKey: ['services', projectId],
  })

  const service = services?.find((s) => s.id === serviceId)
  const analyticsEnabled = service?.analyticsEnabled ?? false
  const statusEnabled = service?.statusEnabled ?? false
  const base = `/projects/${projectId}/services/${serviceId}`

  const items: NavItemDef[] = [
    {
      disabled: !analyticsEnabled,
      icon: BarChart3,
      label: m.common_analytics(),
      path: base,
    },
    {
      disabled: !analyticsEnabled,
      icon: FileText,
      label: m.common_pages(),
      path: `${base}/pages`,
    },
    {
      disabled: !analyticsEnabled,
      icon: MousePointerClick,
      label: m.common_events(),
      path: `${base}/events`,
    },
    {
      disabled: !analyticsEnabled,
      icon: Users,
      label: m.common_sessions(),
      path: `${base}/sessions`,
    },
    {
      disabled: !analyticsEnabled,
      icon: AlertTriangle,
      label: m.common_errors(),
      path: `${base}/errors`,
    },
    {
      disabled: !analyticsEnabled,
      icon: Flag,
      label: m.common_featureFlags(),
      path: `${base}/flags`,
    },
    {
      disabled: !statusEnabled,
      icon: Activity,
      label: m.common_status(),
      path: `${base}/status`,
    },
    { icon: Users, label: m.common_members(), path: `${base}/members` },
    { icon: Settings, label: m.common_settings(), path: `${base}/settings` },
  ]

  return (
    <NavSection items={items} label={m.common_service()} pathname={pathname} />
  )
}

function ServiceSwitcher({ activeServiceId, projectId }: ServiceSwitcherProps) {
  const navigate = useNavigate()

  const { data: services } = useQuery({
    queryFn: () => getProjectServices({ data: projectId }),
    queryKey: ['services', projectId],
  })

  if (!services || services.length === 0) return null

  const items = services.map((s) => ({ id: s.id, label: s.name }))

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SearchableSwitcher
          items={items}
          noResultsText={m.sidebar_noResults()}
          onSelect={(id) => {
            void navigate({
              to: `/projects/${projectId}/services/${id}`,
            })
          }}
          placeholder={m.sidebar_selectService()}
          searchPlaceholder={m.common_search()}
          triggerIcon={<Server className="h-4 w-4" />}
          triggerVariant="ghost"
          value={activeServiceId}
        />
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

  const items = orgs.map((org) => ({ id: org.id, label: org.name }))

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SearchableSwitcher
          footer={
            <Link
              className="hover:bg-accent flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden"
              to="/teams"
            >
              <Plus className="h-4 w-4 shrink-0" />
              {m.sidebar_manageTeams()}
            </Link>
          }
          items={items}
          noResultsText={m.sidebar_noResults()}
          onSelect={(id) => {
            void handleSetActive(id)
          }}
          placeholder={m.sidebar_selectTeam()}
          searchPlaceholder={m.common_search()}
          triggerIcon={<Building2 className="h-4 w-4" />}
          value={activeOrg?.id ?? null}
        />
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
