import { passkey } from '@better-auth/passkey'
import { db } from '@platform/db'
import * as schema from '@platform/db/schema'
import { sendMail } from '@platform/email'
import {
  PasswordReset,
  TeamInvite,
  VerifyEmail,
} from '@platform/email/templates'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { organization } from 'better-auth/plugins/organization'
import { twoFactor } from 'better-auth/plugins/two-factor'

export const auth: ReturnType<typeof betterAuth> = betterAuth({
  baseURL: process.env['BETTER_AUTH_URL'] ?? 'http://localhost:3000',
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
    usePlural: true,
  }),
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ url, user }) => {
      await sendMail({
        subject: 'Reset your password',
        template: PasswordReset({ name: user.name, url }),
        to: user.email,
      })
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ url, user }) => {
      await sendMail({
        subject: 'Verify your email',
        template: VerifyEmail({ name: user.name, url }),
        to: user.email,
      })
    },
  },
  plugins: [
    organization({
      sendInvitationEmail: async ({ invitation, inviter }) => {
        const url = `${process.env['BETTER_AUTH_URL'] ?? 'http://localhost:3000'}/invite/${invitation.id}`
        await sendMail({
          subject: `You've been invited to join a team`,
          template: TeamInvite({
            inviterName: inviter.user.name,
            role: invitation.role,
            teamName: invitation.organizationId,
            url,
          }),
          to: invitation.email,
        })
      },
    }),
    passkey({
      rpID: process.env['PASSKEY_RP_ID'] ?? 'localhost',
      rpName: 'IMaxart Platform',
    }),
    twoFactor({
      issuer: 'IMaxart Platform',
    }),
  ],
  secret: process.env['BETTER_AUTH_SECRET'] ?? process.env['HASH_SECRET'],
  trustedOrigins: [process.env['BETTER_AUTH_URL'] ?? 'http://localhost:3000'],
})

export type Auth = typeof auth
