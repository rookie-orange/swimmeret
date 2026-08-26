import { createFileRoute } from '@tanstack/react-router'

import { ErrorPage } from '../../-components/error-page'

export const Route = createFileRoute('/(errors)/errors/500')({
  component: () => (
    <ErrorPage
      code="500"
      description="服务暂时遇到问题，请稍后再试。"
      title="出了点问题"
    />
  ),
})
