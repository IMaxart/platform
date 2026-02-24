import { auth } from '@platform/auth'
import { createFileRoute } from '@tanstack/react-router'

const handler = async ({ request }: { request: Request }) => {
  return auth.handler(request)
}

export const Route = createFileRoute('/api/auth/$')({
  server: {
    handlers: {
      DELETE: handler,
      GET: handler,
      PATCH: handler,
      POST: handler,
      PUT: handler,
    },
  },
})
