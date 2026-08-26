import { createFileRoute, redirect } from '@tanstack/react-router'

import { AppShell } from '@/components/app-shell'
import { hasAuthKey } from '@/lib/auth'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: () => {
    if (!hasAuthKey()) {
      throw redirect({ to: '/login' })
    }
  },
  component: () => <AppShell />,
})
