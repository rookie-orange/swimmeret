import { createFileRoute } from '@tanstack/react-router'

import { PromptInput } from './-components/prompt-input'

export const Route = createFileRoute('/_authenticated/')({
  component: PromptInput,
})
