import path from 'node:path'

import { getStartSsrServer, normalizeRequestForSsr } from './start-ssr'

const clientDir = path.resolve(process.cwd(), 'dist/client')

const fileExists = async ({ filePath }: { filePath: string }) => {
  try {
    return await Bun.file(filePath).exists()
  } catch {
    return false
  }
}

const serveFile = ({ filePath }: { filePath: string }) => {
  const file = Bun.file(filePath)
  const type = file.type ?? 'application/octet-stream'
  const pathname = filePath.slice(clientDir.length).replaceAll(path.sep, '/')

  const isFingerprintedAsset = pathname.startsWith('/assets/')
  const cacheControl = isFingerprintedAsset
    ? 'public, max-age=31536000, immutable'
    : 'public, max-age=3600'

  return new Response(file, {
    headers: {
      'Cache-Control': cacheControl,
      'Content-Type': type,
    },
  })
}

const resolveStaticPath = ({ url }: { url: URL }) => {
  const pathname = decodeURIComponent(url.pathname)

  const full = path.join(clientDir, pathname)
  if (!full.startsWith(clientDir)) return null
  return full
}

export const handleStaticRequest = async ({ req }: { req: Request }) => {
  const url = new URL(req.url)

  const candidate = resolveStaticPath({ url })
  if (candidate && (await fileExists({ filePath: candidate }))) {
    return serveFile({ filePath: candidate })
  }

  // TanStack Start doesn't generate `dist/client/index.html` unless prerendering is enabled.
  // In production, fall back to the built SSR server bundle.
  const ssrEntry = path.resolve(process.cwd(), 'dist/server/server.js')
  if (await fileExists({ filePath: ssrEntry })) {
    try {
      const startServer = await getStartSsrServer()
      return await startServer.fetch(normalizeRequestForSsr({ req }))
    } catch (error) {
      console.error('SSR bundle failed to serve request', error)
      return new Response('SSR bundle failed. Check server logs.', {
        status: 500,
      })
    }
  }

  return new Response('Build output not found. Run `bun run build` first.', {
    status: 500,
  })
}
