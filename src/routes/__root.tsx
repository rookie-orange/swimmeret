import { createRootRoute, Outlet } from '@tanstack/react-router'

import { ErrorPage } from './(errors)/-components/error-page'

export const Route = createRootRoute({
  component: () => (
    <div className="relative flex h-screen min-h-0 flex-col overflow-hidden">
      <div
        aria-hidden="true"
        className="h-10 shrink-0 select-none"
        data-tauri-drag-region
      />
      <div className="min-h-0 flex-1">
        <Outlet />
      </div>
    </div>
  ),
  notFoundComponent: () => (
    <ErrorPage
      code="404"
      description="你访问的页面不存在，或已经被移动。"
      title="页面未找到"
    />
  ),
})
