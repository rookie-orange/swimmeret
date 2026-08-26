import { createRootRoute, Outlet } from '@tanstack/react-router'

import { ErrorPage } from './(errors)/-components/error-page'

export const Route = createRootRoute({
  component: () => <Outlet />,
  notFoundComponent: () => (
    <ErrorPage
      code="404"
      description="你访问的页面不存在，或已经被移动。"
      title="页面未找到"
    />
  ),
})
