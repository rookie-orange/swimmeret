import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'

import { hasAuthKey } from '@/lib/auth'

export const Route = createFileRoute('/(canvas)')({
  beforeLoad: () => {
    if (!hasAuthKey()) {
      throw redirect({ to: '/login' })
    }
  },
  component: () => <Outlet />,
})
