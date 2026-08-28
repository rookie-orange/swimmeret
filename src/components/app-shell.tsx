import { Outlet } from '@tanstack/react-router'
import { WorkspaceCapsule } from '@/components/workspace-capsule'

export function AppShell() {
  return (
    <div className="relative flex h-full min-h-0 overflow-hidden bg-background text-foreground">
      <div className="min-h-0 min-w-0 flex-1 p-3 pl-20">
        <div className="h-full min-h-0 min-w-0 overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
          <Outlet />
        </div>
      </div>
      <WorkspaceCapsule className="pointer-events-none absolute inset-y-0 left-0 z-40 flex w-20 flex-col items-center px-3 py-4" />
    </div>
  )
}
