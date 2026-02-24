import type { ReactElement } from 'react'

import { render } from '@react-email/render'

import { hasSmtp, smtpFrom, transporter } from './transport'

type SendMailParams = {
  subject: string
  template: ReactElement
  to: string
}

export const sendMail = async ({ subject, template, to }: SendMailParams) => {
  const html = await render(template)

  if (!hasSmtp || !transporter) {
    console.log(`[email] No SMTP configured. Would send to: ${to}`)
    console.log(`[email] Subject: ${subject}`)
    console.log(`[email] HTML preview:\n${html.slice(0, 500)}...`)
    return
  }

  await transporter.sendMail({
    from: smtpFrom,
    html,
    subject,
    to,
  })
}
