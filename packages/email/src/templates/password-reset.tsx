import { Button, Text } from '@react-email/components'
import type { CSSProperties } from 'react'

import { Layout } from './layout'

type PasswordResetProps = {
  name: string
  url: string
}

export const PasswordReset = ({ name, url }: PasswordResetProps) => (
  <Layout preview="Reset your password">
    <Text style={heading}>Reset your password</Text>
    <Text style={paragraph}>
      Hi {name}, we received a request to reset your password. Click the button
      below to choose a new one.
    </Text>
    <Button href={url} style={button}>
      Reset Password
    </Button>
    <Text style={hint}>
      This link expires in 1 hour. If you didn&apos;t request a password reset,
      you can safely ignore this email.
    </Text>
  </Layout>
)

const heading: CSSProperties = {
  color: '#0f172a',
  fontSize: '22px',
  fontWeight: 600,
  lineHeight: '28px',
  margin: '0 0 16px',
}

const paragraph: CSSProperties = {
  color: '#475569',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0 0 24px',
}

const button: CSSProperties = {
  backgroundColor: '#0f172a',
  borderRadius: '8px',
  color: '#ffffff',
  display: 'inline-block',
  fontSize: '14px',
  fontWeight: 500,
  lineHeight: '100%',
  padding: '12px 24px',
  textDecoration: 'none',
}

const hint: CSSProperties = {
  color: '#94a3b8',
  fontSize: '13px',
  lineHeight: '20px',
  margin: '24px 0 0',
}
