import { organizationClient, twoFactorClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'

import { passkeyClient } from '@better-auth/passkey/client'

export const authClient = createAuthClient({
  plugins: [organizationClient(), passkeyClient(), twoFactorClient()],
})

export const {
  useSession,
  signIn,
  signUp,
  signOut,
  useActiveOrganization,
  useListOrganizations,
} = authClient
