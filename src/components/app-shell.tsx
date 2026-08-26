import { Outlet } from '@tanstack/react-router'
import { WorkspaceCapsule } from '@/components/workspace-capsule'

export function AppShell() {
  return (
    <div className="relative flex h-screen min-h-0 overflow-hidden bg-background text-foreground">
      <div className="min-h-0 flex-1">
        <Outlet />
      </div>
      <WorkspaceCapsule />
    </div>
  )
}
