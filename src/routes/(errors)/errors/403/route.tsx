import { createFileRoute } from '@tanstack/react-router'

import { ErrorPage } from '../../-components/error-page'

export const Route = createFileRoute('/(errors)/errors/403')({
  component: () => (
    <ErrorPage
      code="403"
      description="你没有权限访问这个页面。"
      title="访问被拒绝"
    />
  ),
})
