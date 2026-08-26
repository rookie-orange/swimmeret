import { createFileRoute } from '@tanstack/react-router'

import { ErrorPage } from '../../-components/error-page'

export const Route = createFileRoute('/(errors)/errors/404')({
  component: () => (
    <ErrorPage
      code="404"
      description="你访问的页面不存在，或已经被移动。"
      title="页面未找到"
    />
  ),
})
