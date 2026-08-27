import { createRootRoute, Outlet } from '@tanstack/react-router'

import { ErrorPage } from './(errors)/-components/error-page'

export const Route = createRootRoute({
  component: () => (
    <div className="relative h-screen min-h-0 overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 z-10 h-10 select-none"
        data-tauri-drag-region
      />
      <Outlet />
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
