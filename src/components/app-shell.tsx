import { Outlet } from '@tanstack/react-router'
import { WorkspaceCapsule } from '@/components/workspace-capsule'

export function AppShell() {
  return (
    <div className="grid h-full min-h-0 grid-cols-[3.5rem_minmax(0,1fr)] gap-3 overflow-hidden bg-background p-3 text-foreground sm:grid-cols-[4.5rem_minmax(0,1fr)]">
      <WorkspaceCapsule className="flex min-h-0 w-full flex-col items-center" />
      <div className="min-h-0 min-w-0 overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <Outlet />
      </div>
    </div>
  )
}
