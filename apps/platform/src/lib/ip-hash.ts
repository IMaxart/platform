import crypto from 'node:crypto'

const HASH_SECRET =
  process.env['HASH_SECRET'] ?? 'local-development-secret-change-in-production'

const DAILY_ROTATION = process.env['HASH_DAILY_ROTATION'] === 'true'

/** Deterministic visitor hash using HMAC-SHA256. When HASH_DAILY_ROTATION is enabled, hashes rotate daily (same visitor = new hash each day). @param ip - Client IP address. @param salt - Per-service salt. @param userAgent - User-Agent string. @returns Hex-encoded SHA256 hash. */
export const hashIP = ({
  ip,
  salt,
  userAgent,
}: {
  ip: string
  salt: string
  userAgent: string
}): string => {
  const input = DAILY_ROTATION
    ? `${ip}:${userAgent}:${salt}:${new Date().toISOString().slice(0, 10)}`
    : `${ip}:${userAgent}:${salt}`

  return crypto.createHmac('sha256', HASH_SECRET).update(input).digest('hex')
}
