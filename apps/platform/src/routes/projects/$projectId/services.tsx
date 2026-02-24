import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/projects/$projectId/services')({
  component: () => <Outlet />,
})
