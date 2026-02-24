import type { ReactNode } from 'react'

import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from '@react-email/components'

type LayoutProps = {
  children: ReactNode
  preview: string
}

export const Layout = ({ children, preview }: LayoutProps) => (
  <Html>
    <Head />
    <Preview>{preview}</Preview>
    <Body style={body}>
      <Container style={container}>
        <Section style={header}>
          <Img
            alt="IMaxart"
            height={32}
            src="https://platform.imaxart.com/logo.png"
            width={32}
          />
          <Text style={brandName}>IMaxart Platform</Text>
        </Section>
        <Section style={content}>{children}</Section>
        <Hr style={hr} />
        <Text style={footer}>
          IMaxart Platform &mdash; Open-source analytics &amp; status monitoring
        </Text>
      </Container>
    </Body>
  </Html>
)

const body = {
  backgroundColor: '#f8fafc',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
  margin: '0' as const,
  padding: '0' as const,
}

const container = {
  backgroundColor: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: '12px',
  margin: '40px auto',
  maxWidth: '520px',
  padding: '0',
}

const header = {
  alignItems: 'center' as const,
  borderBottom: '1px solid #f1f5f9',
  display: 'flex' as const,
  gap: '10px',
  padding: '24px 32px',
}

const brandName = {
  color: '#0f172a',
  fontSize: '16px',
  fontWeight: '600' as const,
  margin: '0',
}

const content = {
  padding: '32px',
}

const hr = {
  borderColor: '#f1f5f9',
  margin: '0',
}

const footer = {
  color: '#94a3b8',
  fontSize: '12px',
  lineHeight: '20px',
  padding: '16px 32px',
  textAlign: 'center' as const,
}
