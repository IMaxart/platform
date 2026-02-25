import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@platform/ui/components/avatar'
import { Button } from '@platform/ui/components/button'
import { AlertCircle, Camera, Loader2 } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'

type ImageUploadProps = {
  currentImage: null | string | undefined
  entityId: string
  entityType: 'project' | 'service' | 'user'
  fallback: string
  onUploaded?: (url: string) => void
  size?: 'lg' | 'md' | 'sm'
}

const sizeMap = {
  lg: 'h-20 w-20',
  md: 'h-14 w-14',
  sm: 'h-10 w-10',
} as const

export const ImageUpload = ({
  currentImage,
  entityId,
  entityType,
  fallback,
  onUploaded,
  size = 'md',
}: ImageUploadProps) => {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<null | string>(currentImage ?? null)
  const [error, setError] = useState<null | string>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleUpload = useCallback(
    async (file: File) => {
      setUploading(true)
      setError(null)

      const formData = new FormData()
      formData.append('file', file)
      formData.append('entityType', entityType)
      formData.append('entityId', entityId)

      try {
        const res = await fetch('/api/upload', {
          body: formData,
          method: 'POST',
        })

        const data = (await res.json()) as { error?: string; url?: string }

        if (!res.ok || (data.error !== undefined && data.error !== '')) {
          setError(data.error ?? 'Upload failed')
          setUploading(false)
          return
        }

        if (data.url !== undefined) {
          setPreview(data.url)
          onUploaded?.(data.url)
        }
      } catch {
        setError('Network error. Try again.')
      }

      setUploading(false)
    },
    [entityId, entityType, onUploaded],
  )

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      void handleUpload(file)
    }
  }

  return (
    <div className="space-y-1">
      <div className="group relative inline-block">
        <Avatar className={sizeMap[size]}>
          <AvatarImage alt={fallback} src={preview ?? undefined} />
          <AvatarFallback className="text-xs">{fallback}</AvatarFallback>
        </Avatar>
        <Button
          className="absolute -right-1 -bottom-1 h-6 w-6 rounded-full shadow-sm transition-opacity hover:opacity-80"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          size="icon"
          variant="secondary"
        >
          {uploading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Camera className="h-3 w-3" />
          )}
        </Button>
        <input
          accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
          className="hidden"
          onChange={handleChange}
          ref={inputRef}
          type="file"
        />
      </div>
      {error !== null ? (
        <p className="text-destructive flex items-center gap-1 text-xs">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      ) : null}
    </div>
  )
}
