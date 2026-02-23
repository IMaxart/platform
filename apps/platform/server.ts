import path from 'node:path'
import { gzipSync } from 'node:zlib'

const SERVER_PORT = Number(process.env.PORT ?? 3000)
const CLIENT_DIR = path.resolve('./dist/client')
const SERVER_ENTRY = './dist/server/server.js'

const COMPRESSIBLE_TYPES = new Set([
  'text/html',
  'text/css',
  'text/javascript',
  'application/javascript',
  'application/json',
  'image/svg+xml',
])

const shouldCompress = (contentType: string): boolean =>
  COMPRESSIBLE_TYPES.has(contentType.split(';')[0]?.trim() ?? '')

const compressResponse = async (
  response: Response,
  acceptEncoding: string,
): Promise<Response> => {
  if (!acceptEncoding.includes('gzip')) return response

  const contentType = response.headers.get('content-type') ?? ''
  if (!shouldCompress(contentType)) return response

  const body = await response.arrayBuffer()
  if (body.byteLength < 256) return new Response(body, response)

  const compressed = gzipSync(Buffer.from(body))
  const headers = new Headers(response.headers)
  headers.set('Content-Encoding', 'gzip')
  headers.set('Content-Length', String(compressed.byteLength))
  headers.set('Vary', 'Accept-Encoding')

  return new Response(compressed, {
    headers,
    status: response.status,
    statusText: response.statusText,
  })
}

async function start() {
  const serverModule = (await import(SERVER_ENTRY)) as {
    default: { fetch: (request: Request) => Promise<Response> | Response }
  }
  const handler = serverModule.default

  const server = Bun.serve({
    port: SERVER_PORT,
    async fetch(request) {
      const url = new URL(request.url)
      const acceptEncoding = request.headers.get('accept-encoding') ?? ''

      const filePath = path.join(CLIENT_DIR, url.pathname)
      const file = Bun.file(filePath)

      if (await file.exists()) {
        const isAsset = url.pathname.includes('/assets/')
        const cacheControl = isAsset
          ? 'public, max-age=31536000, immutable'
          : 'public, max-age=3600'

        const response = new Response(file, {
          headers: { 'Cache-Control': cacheControl },
        })

        return compressResponse(response, acceptEncoding)
      }

      const response = await handler.fetch(request)
      return compressResponse(response, acceptEncoding)
    },
  })

  console.log(`Server listening on http://localhost:${String(server.port)}`)
}

start().catch((err: unknown) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
