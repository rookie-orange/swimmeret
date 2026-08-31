import { Outlet } from '@tanstack/react-router'
import { WorkspaceCapsule } from '@/components/workspace-capsule'

export function AppShell() {
  return (
    <div className="grid h-full min-h-0 grid-cols-[5rem_minmax(0,1fr)] overflow-hidden text-foreground sm:grid-cols-[5.5rem_minmax(0,1fr)]">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-10 select-none"
        data-tauri-drag-region
      />
      <div className="min-h-0 p-4">
        <WorkspaceCapsule className="flex h-full min-h-0 w-full flex-col items-center pt-4" />
      </div>
      <div className="min-h-0 min-w-0 overflow-hidden bg-card">
        <Outlet />
      </div>
    </div>
  )
}
