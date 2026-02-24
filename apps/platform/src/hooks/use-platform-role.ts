import { useSession } from '@platform/auth/client'
import { useQuery } from '@tanstack/react-query'

import { getUserRole } from '~/lib/server/auth'

export const usePlatformRole = () => {
  const { data: session } = useSession()

  const userId = session?.user?.id
  const { data: role } = useQuery({
    enabled: !!userId,
    queryFn: () => getUserRole({ data: userId ?? '' }),
    queryKey: ['platform-role', userId],
    staleTime: 5 * 60 * 1000,
  })

  return {
    isAdmin: role === 'super_admin' || role === 'admin',
    isSuperAdmin: role === 'super_admin',
    role: role ?? 'user',
  }
}
