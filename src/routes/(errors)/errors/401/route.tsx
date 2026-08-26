import { createFileRoute } from '@tanstack/react-router'

import { ErrorPage } from '../../-components/error-page'

export const Route = createFileRoute('/(errors)/errors/401')({
  component: () => (
    <ErrorPage
      code="401"
      description="当前请求需要有效的访问凭证。"
      title="需要登录"
    />
  ),
})
