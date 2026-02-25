import path from 'node:path'
import { pathToFileURL } from 'node:url'

type StartServer = {
  fetch: (request: Request, requestOpts?: unknown) => Promise<Response>
}

type StartServerModule = {
  default: StartServer
}

let cached: null | Promise<StartServer> = null

export const getStartSsrServer = async (): Promise<StartServer> => {
  if (cached) return await cached

  cached = (async () => {
    const abs = path.resolve(process.cwd(), 'dist/server/server.js')
    const url = pathToFileURL(abs).toString()
    const mod = (await import(url)) as unknown as StartServerModule

    if (typeof mod.default.fetch !== 'function') {
      throw new Error('Invalid TanStack Start server bundle')
    }

    return mod.default
  })()

  return await cached
}

export const normalizeRequestForSsr = ({ req }: { req: Request }) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return req

  const forwardedProto = req.headers.get('x-forwarded-proto')
  const proto = forwardedProto === 'https' ? 'https' : 'http'

  const forwardedHost = req.headers.get('x-forwarded-host')
  const hostHeader = req.headers.get('host')
  const host = (forwardedHost ?? hostHeader)?.split(',')[0]?.trim()
  if (host === undefined) return req

  const url = new URL(req.url)
  const absolute = `${proto}://${host}${url.pathname}${url.search}${url.hash}`

  return new Request(absolute, {
    headers: req.headers,
    method: req.method,
  })
}
