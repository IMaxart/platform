import { db } from '@platform/db'
import { projects, services, users } from '@platform/db/schema'
import { createFileRoute } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'

const MAX_SIZE = 2 * 1024 * 1024

const ALLOWED_TYPES = new Set([
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/svg+xml',
  'image/webp',
])

const VALID_ENTITY_TYPES = new Set(['project', 'service', 'user'])

export const Route = createFileRoute('/api/upload')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const formData = await request.formData()
          const file = formData.get('file')
          const entityType = formData.get('entityType') as string
          const entityId = formData.get('entityId') as string

          if (!entityType || !entityId || !VALID_ENTITY_TYPES.has(entityType)) {
            return Response.json(
              { error: 'Invalid entity type or ID' },
              { status: 400 },
            )
          }

          if (!file || typeof file === 'string') {
            return Response.json({ error: 'No file provided' }, { status: 400 })
          }

          const blob = file as Blob
          const fileName =
            'name' in file ? (file as { name: string }).name : 'upload.png'
          const fileType = blob.type

          if (!ALLOWED_TYPES.has(fileType)) {
            return Response.json(
              {
                error: `Invalid file type: ${fileType}. Use PNG, JPG, WebP, SVG, or GIF.`,
              },
              { status: 400 },
            )
          }

          if (blob.size > MAX_SIZE) {
            return Response.json(
              { error: 'File too large. Max 2MB.' },
              { status: 400 },
            )
          }

          const ext = fileName.split('.').pop() ?? 'png'
          const storedName = `${entityType}-${entityId}-${Date.now()}.${ext}`
          const uploadDir = `${process.cwd()}/public/uploads/${entityType}`
          const filePath = `${uploadDir}/${storedName}`

          await Bun.write(Bun.file(`${uploadDir}/.keep`), '')
          await Bun.write(Bun.file(filePath), blob)

          const imageUrl = `/uploads/${entityType}/${storedName}`

          switch (entityType) {
            case 'project':
              await db
                .update(projects)
                .set({ image: imageUrl })
                .where(eq(projects.id, entityId))
              break
            case 'service':
              await db
                .update(services)
                .set({ image: imageUrl })
                .where(eq(services.id, entityId))
              break
            case 'user':
              await db
                .update(users)
                .set({ image: imageUrl })
                .where(eq(users.id, entityId))
              break
          }

          return Response.json({ url: imageUrl })
        } catch (err) {
          console.error('[Upload Error]', err)
          return Response.json(
            { error: 'Upload failed. Please try again.' },
            { status: 500 },
          )
        }
      },
    },
  },
})
