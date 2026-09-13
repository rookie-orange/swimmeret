import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'

import { hasAuthKey } from '@/lib/auth'

export const Route = createFileRoute('/image-editor')({
  beforeLoad: () => {
    if (!hasAuthKey()) {
      throw redirect({ to: '/login' })
    }
  },
  component: Outlet,
})
