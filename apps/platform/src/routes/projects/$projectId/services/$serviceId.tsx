import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute(
  '/projects/$projectId/services/$serviceId',
)({
  component: () => <Outlet />,
})
