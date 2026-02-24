import { Button, Text } from '@react-email/components'

import { Layout } from './layout'

type WelcomeProps = {
  name: string
  url: string
}

export const Welcome = ({ name, url }: WelcomeProps) => (
  <Layout preview={`Welcome to IMaxart Platform, ${name}!`}>
    <Text style={heading}>Welcome, {name}!</Text>
    <Text style={paragraph}>
      Your account has been created. You can now start setting up your first
      team and project.
    </Text>
    <Button href={url} style={button}>
      Go to Dashboard
    </Button>
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
