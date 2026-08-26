import { createFileRoute } from '@tanstack/react-router'

import { ErrorPage } from '../../-components/error-page'

const descriptions: Record<string, { description: string; title: string }> = {
  '400': { description: '请求格式不正确，请检查后再试。', title: '请求无效' },
  '401': { description: '当前请求需要有效的访问凭证。', title: '需要登录' },
  '403': { description: '你没有权限访问这个页面。', title: '访问被拒绝' },
  '404': {
    description: '你访问的页面不存在，或已经被移动。',
    title: '页面未找到',
  },
  '429': { description: '请求太频繁了，请稍后再试。', title: '请求过于频繁' },
  '500': { description: '服务暂时遇到问题，请稍后再试。', title: '出了点问题' },
  '502': {
    description: '上游服务暂时不可用，请稍后再试。',
    title: '服务暂时不可用',
  },
  '503': { description: '服务正在维护，请稍后再试。', title: '服务维护中' },
}

function StatusErrorPage() {
  const { status } = Route.useParams()
  const copy = descriptions[status] ?? {
    description: '请求暂时无法完成，请稍后再试。',
    title: '请求失败',
  }

  return (
    <ErrorPage
      code={status}
      description={copy.description}
      title={copy.title}
    />
  )
}

export const Route = createFileRoute('/(errors)/errors/$status')({
  component: StatusErrorPage,
})
