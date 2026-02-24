import { createTransport } from 'nodemailer'

const env = process.env

const smtpHost = env['SMTP_HOST']
const smtpPort = Number(env['SMTP_PORT'] ?? '587')
const smtpUser = env['SMTP_USER']
const smtpPass = env['SMTP_PASS']

export const smtpFrom =
  env['SMTP_FROM'] ?? 'IMaxart Platform <noreply@localhost>'

export const hasSmtp = Boolean(smtpHost)

export const transporter = smtpHost
  ? createTransport({
      auth:
        smtpUser && smtpPass ? { pass: smtpPass, user: smtpUser } : undefined,
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
    })
  : null
