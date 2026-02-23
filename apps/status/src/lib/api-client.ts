export class ApiError extends Error {
  public readonly status: number

  public constructor({ message, status }: { message: string; status: number }) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

const readJson = async <T>(res: Response): Promise<T> => {
  const data: unknown = await res.json().catch(() => null)
  return data as T
}

export const fetchJson = async <T>({
  init,
  url,
}: {
  init?: RequestInit
  url: string
}): Promise<T> => {
  const res = await fetch(url, init)
  if (res.ok) return await readJson<T>(res)

  const fallbackMessage = `Request failed (${res.status})`
  const body = await readJson<{ error?: string }>(res)
  const message = body?.error ?? fallbackMessage
  throw new ApiError({ message, status: res.status })
}
