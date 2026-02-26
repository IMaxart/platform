import { Button, Text } from '@react-email/components'

import { Layout } from './layout'

type ServiceInviteProps = {
  inviterName?: string
  role: string
  serviceName: string
  url: string
}

export const ServiceInvite = ({
  inviterName,
  role,
  serviceName,
  url,
}: ServiceInviteProps) => (
  <Layout preview={`You've been invited to service ${serviceName}`}>
    <Text style={heading}>Service Invitation</Text>
    <Text style={paragraph}>
      {inviterName !== undefined
        ? `${inviterName} has invited you`
        : 'You have been invited'}{' '}
      to join service <strong>{serviceName}</strong> as a{' '}
      <strong>{role}</strong>.
    </Text>
    <Button href={url} style={button}>
      Join Service
    </Button>
    <Text style={hint}>
      If you don&apos;t recognize this invitation, you can safely ignore this
      email.
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
