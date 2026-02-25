import { passkeyClient } from '@better-auth/passkey/client'
import { organizationClient, twoFactorClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
  plugins: [organizationClient(), passkeyClient(), twoFactorClient()],
})

export const {
  signIn,
  signOut,
  signUp,
  useActiveOrganization,
  useListOrganizations,
  useSession,
} = authClient
