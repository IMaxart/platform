import { Button, Text } from '@react-email/components'

import { Layout } from './layout'

type VerifyEmailProps = {
  name: string
  url: string
}

export const VerifyEmail = ({ name, url }: VerifyEmailProps) => (
  <Layout preview="Verify your email address">
    <Text style={heading}>Verify your email</Text>
    <Text style={paragraph}>
      Hi {name}, click the button below to verify your email address and
      activate your account.
    </Text>
    <Button href={url} style={button}>
      Verify Email
    </Button>
    <Text style={hint}>
      If you didn&apos;t create an account, you can safely ignore this email.
    </Text>
  </Layout>
)

const heading = {
  color: '#0f172a',
  fontSize: '22px',
  fontWeight: '600' as const,
  lineHeight: '28px',
  margin: '0 0 16px',
}

const paragraph = {
  color: '#475569',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0 0 24px',
}

const button = {
  backgroundColor: '#0f172a',
  borderRadius: '8px',
  color: '#ffffff',
  display: 'inline-block' as const,
  fontSize: '14px',
  fontWeight: '500' as const,
  lineHeight: '100%',
  padding: '12px 24px',
  textDecoration: 'none',
}

const hint = {
  color: '#94a3b8',
  fontSize: '13px',
  lineHeight: '20px',
  margin: '24px 0 0',
}
