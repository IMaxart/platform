import type { LucideIcon } from 'lucide-react'

import { Link, useLocation } from '@tanstack/react-router'
import {
  AlertTriangle,
  BarChart3,
  FileText,
  Flag,
  Globe,
  MousePointerClick,
  Settings,
  Users,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

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
} from '~/components/ui/sidebar'
import { cn } from '~/lib/utils'

type NavItem = {
  feature?: keyof ProjectConfig
  icon: LucideIcon
  key: string
  path: string
}

type ProjectConfig = {
  trackErrors: boolean
  trackEvents: boolean
  trackFeatureFlags: boolean
}

const NAV_ITEMS: NavItem[] = [
  { icon: BarChart3, key: 'overview', path: '/' },
  { icon: FileText, key: 'pages', path: '/pages' },
  {
    feature: 'trackEvents',
    icon: MousePointerClick,
    key: 'events',
    path: '/events',
  },
  { icon: Users, key: 'sessions', path: '/sessions' },
  {
    feature: 'trackErrors',
    icon: AlertTriangle,
    key: 'errors',
    path: '/errors',
  },
  {
    feature: 'trackFeatureFlags',
    icon: Flag,
    key: 'featureFlags',
    path: '/feature-flags',
  },
  { icon: Settings, key: 'settings', path: '/settings' },
]

type AppSidebarProps = {
  projectConfig?: ProjectConfig
}

export const AppSidebar = ({ projectConfig }: AppSidebarProps) => {
  const { t } = useTranslation()
  const location = useLocation()

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.feature || projectConfig?.[item.feature],
  )

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-6 py-5">
        <Link className="flex items-center gap-2.5" to="/">
          <Globe className="h-5 w-5" />
          <span className="text-lg font-semibold tracking-tight">
            {t('common.analytics')}
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="pt-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground/70 px-3 text-[11px] font-medium tracking-wider uppercase">
            {t('common.dashboard')}
          </SidebarGroupLabel>
          <SidebarGroupContent className="mt-1">
            <SidebarMenu>
              {visibleItems.map((item) => {
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
                        <span>{t(`common.${item.key}`)}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
