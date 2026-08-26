import { useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowUp02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { Button } from '@/components/ui/button'

export function PromptInput() {
  const [value, setValue] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!value.trim()) return
    setValue('')
  }

  return (
    <section className="flex min-h-0 flex-1 items-center justify-center px-4 py-8">
      <form className="w-full max-w-3xl" onSubmit={handleSubmit}>
        <div className="flex items-end gap-2 rounded-3xl border border-input bg-background p-3 shadow-sm transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/15">
          <textarea
            aria-label="输入消息"
            className="min-h-12 flex-1 resize-none bg-transparent px-2 py-3 text-sm leading-6 outline-none placeholder:text-muted-foreground"
            onChange={(event) => setValue(event.currentTarget.value)}
            placeholder="给 swimmeret 发消息"
            rows={1}
            value={value}
          />
          <Button
            aria-label="发送消息"
            className="rounded-full"
            size="icon-lg"
            type="submit"
          >
            <HugeiconsIcon icon={ArrowUp02Icon} />
          </Button>
        </div>
      </form>
    </section>
  )
}
