import { createFileRoute } from '@tanstack/react-router'

import { HistoryPage } from './-components/history-page'

export const Route = createFileRoute('/_authenticated/history')({
  component: HistoryPage,
})
