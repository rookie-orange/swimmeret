import { SparklesIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { Button } from '@/components/ui/button'

type StarterPromptProps = {
  prompt: string
  onSelect: (prompt: string) => void
}

export function StarterPrompt({ prompt, onSelect }: StarterPromptProps) {
  return (
    <Button
      className="h-auto justify-start gap-3 whitespace-normal rounded-2xl border border-border bg-card/60 px-4 py-3 text-left font-normal text-muted-foreground hover:border-primary/40 hover:bg-secondary hover:text-foreground"
      onClick={() => onSelect(prompt)}
      variant="ghost"
    >
      <HugeiconsIcon icon={SparklesIcon} data-icon="inline-start" />
      <span className="min-w-0">{prompt}</span>
    </Button>
  )
}
