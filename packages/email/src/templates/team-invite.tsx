import { Button, Text } from '@react-email/components'

import { Layout } from './layout'

type TeamInviteProps = {
  inviterName?: string
  role: string
  teamName: string
  url: string
}

export const TeamInvite = ({
  inviterName,
  role,
  teamName,
  url,
}: TeamInviteProps) => (
  <Layout preview={`You've been invited to join ${teamName}`}>
    <Text style={heading}>Team Invitation</Text>
    <Text style={paragraph}>
      {inviterName ? `${inviterName} has invited you` : 'You have been invited'}{' '}
      to join <strong>{teamName}</strong> as a <strong>{role}</strong>.
    </Text>
    <Button href={url} style={button}>
      Join Team
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
