import crypto from 'node:crypto'

const HASH_SECRET =
  process.env['HASH_SECRET'] ?? 'local-development-secret-change-in-production'

/** Deterministic visitor hash per day using HMAC-SHA256. Salted by date so hashes rotate daily for privacy. @param ip - Client IP address. @param salt - Per-request or per-session salt. @param userAgent - User-Agent string. @returns Hex-encoded SHA256 hash. */
export const hashIP = ({
  ip,
  salt,
  userAgent,
}: {
  ip: string
  salt: string
  userAgent: string
}): string => {
  const today = new Date().toISOString().slice(0, 10)
  const input = `${ip}:${userAgent}:${salt}:${today}`

  return crypto.createHmac('sha256', HASH_SECRET).update(input).digest('hex')
}
