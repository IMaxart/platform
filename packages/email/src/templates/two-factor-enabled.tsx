import { Text } from '@react-email/components'

import { Layout } from './layout'

type TwoFactorEnabledProps = {
  name: string
}

export const TwoFactorEnabled = ({ name }: TwoFactorEnabledProps) => (
  <Layout preview="Two-factor authentication enabled">
    <Text style={heading}>2FA Enabled</Text>
    <Text style={paragraph}>
      Hi {name}, two-factor authentication has been successfully enabled on your
      account. You will now be asked for a verification code when signing in.
    </Text>
    <Text style={warning}>
      If you did not enable this, please secure your account immediately by
      resetting your password.
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
  margin: '0 0 16px',
}

const warning = {
  backgroundColor: '#fef3c7',
  borderRadius: '8px',
  color: '#92400e',
  fontSize: '13px',
  lineHeight: '20px',
  margin: '16px 0 0',
  padding: '12px 16px',
}
