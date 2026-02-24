import { cn } from '@platform/ui'
import { useQuery } from '@tanstack/react-query'
import {
  createFileRoute,
  Link,
  Outlet,
  useParams,
} from '@tanstack/react-router'
import {
  Activity,
  AlertTriangle,
  BarChart3,
  FileText,
  Flag,
  MousePointerClick,
  Server,
  Settings,
  Users,
} from 'lucide-react'

import { getProject } from '~/lib/server/queries'

export const Route = createFileRoute('/projects/$projectId')({
  component: ProjectLayout,
})

const PROJECT_NAV = [
  { icon: BarChart3, key: 'overview', label: 'Overview', path: '' },
  { icon: FileText, key: 'pages', label: 'Pages', path: '/pages' },
  { icon: MousePointerClick, key: 'events', label: 'Events', path: '/events' },
  { icon: Users, key: 'sessions', label: 'Sessions', path: '/sessions' },
  { icon: AlertTriangle, key: 'errors', label: 'Errors', path: '/errors' },
  { icon: Flag, key: 'flags', label: 'Feature Flags', path: '/feature-flags' },
  { icon: Server, key: 'services', label: 'Services', path: '/services' },
  { icon: Activity, key: 'status', label: 'Status', path: '/status' },
  { icon: Users, key: 'members', label: 'Members', path: '/members' },
  { icon: Settings, key: 'settings', label: 'Settings', path: '/settings' },
] as const

type ProjectNavItemProps = {
  icon: typeof BarChart3
  label: string
  path: string
  projectId: string
}

function ProjectLayout() {
  const { projectId } = useParams({ from: '/projects/$projectId' })

  const { data: project } = useQuery({
    queryFn: () => getProject({ data: projectId }),
    queryKey: ['project', projectId],
  })

  return (
    <div className="flex h-full">
      <nav className="w-52 shrink-0 overflow-y-auto border-r p-3">
        <div className="mb-4 px-2">
          <p className="truncate text-sm font-semibold">
            {project?.name ?? 'Project'}
          </p>
        </div>
        <ul className="space-y-0.5">
          {PROJECT_NAV.map((item) => (
            <ProjectNavItem
              icon={item.icon}
              key={item.key}
              label={item.label}
              path={item.path}
              projectId={projectId}
            />
          ))}
        </ul>
      </nav>
      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  )
}

function ProjectNavItem({
  icon: Icon,
  label,
  path,
  projectId,
}: ProjectNavItemProps) {
  const basePath = `/projects/${projectId}`
  const fullPath = `${basePath}${path}`

  return (
    <li>
      <Link
        activeOptions={{ exact: path === '' }}
        className={cn(
          'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors',
          'text-muted-foreground hover:bg-accent hover:text-foreground',
          '[&.active]:bg-accent [&.active]:text-foreground [&.active]:font-medium',
        )}
        to={fullPath}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {label}
      </Link>
    </li>
  )
}
