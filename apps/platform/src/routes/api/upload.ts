import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { db } from '@platform/db'
import { projects, services, users } from '@platform/db/schema'
import { createAPIFileRoute } from '@tanstack/react-start/api'
import { eq } from 'drizzle-orm'

const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads')
const MAX_SIZE = 2 * 1024 * 1024

const ALLOWED_TYPES = new Set([
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/svg+xml',
  'image/webp',
])

export const APIRoute = createAPIFileRoute('/api/upload')({
  POST: async ({ request }) => {
    const formData = await request.formData()
    const file = formData.get('file')
    const entityType = formData.get('entityType') as string
    const entityId = formData.get('entityId') as string

    if (!(file instanceof File)) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return new Response(
        JSON.stringify({ error: 'Invalid file type. Use PNG, JPG, WebP, SVG, or GIF.' }),
        { headers: { 'Content-Type': 'application/json' }, status: 400 },
      )
    }

    if (file.size > MAX_SIZE) {
      return new Response(
        JSON.stringify({ error: 'File too large. Max 2MB.' }),
        { headers: { 'Content-Type': 'application/json' }, status: 400 },
      )
    }

    const ext = file.name.split('.').pop() ?? 'png'
    const fileName = `${entityType}-${entityId}-${Date.now()}.${ext}`
    const dir = join(UPLOAD_DIR, entityType)

    await mkdir(dir, { recursive: true })

    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(join(dir, fileName), buffer)

    const imageUrl = `/uploads/${entityType}/${fileName}`

    const updateImage = async () => {
      switch (entityType) {
        case 'project':
          await db.update(projects).set({ image: imageUrl }).where(eq(projects.id, entityId))
          break
        case 'service':
          await db.update(services).set({ image: imageUrl }).where(eq(services.id, entityId))
          break
        case 'user':
          await db.update(users).set({ image: imageUrl }).where(eq(users.id, entityId))
          break
      }
    }

    await updateImage()

    return new Response(JSON.stringify({ url: imageUrl }), {
      headers: { 'Content-Type': 'application/json' },
    })
  },
})
