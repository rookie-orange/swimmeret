import { useState } from 'react'
import type { SubmitEventHandler } from 'react'
import { ArrowUp02Icon, PlusIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { Button } from '@/components/ui/button'

export function PromptInput() {
  const [value, setValue] = useState('')

  const handleSubmit: SubmitEventHandler<HTMLFormElement> = (event) => {
    event?.preventDefault()
    if (!value.trim()) return
    setValue('')
  }

  return (
    <section className="flex min-h-0 flex-1 items-center justify-center px-4 py-8">
      <form className="w-full max-w-3xl" onSubmit={handleSubmit}>
        <div className="border h-fit rounded-3xl flex items-center justify-center p-1 gap-1">
          <Button
            aria-label="发送消息"
            size="icon-lg"
            type="submit"
            variant={'ghost'}
          >
            <HugeiconsIcon icon={PlusIcon} className="size-5" />
          </Button>
          <textarea
            aria-label="输入消息"
            className="h-full bg-transparent flex-1 resize-none outline-none placeholder:text-muted-foreground"
            onChange={(event) => setValue(event.currentTarget.value)}
            placeholder="给 swimmeret 发消息"
            rows={1}
            value={value}
          />
          <Button aria-label="发送消息" size="icon-lg" type="submit">
            <HugeiconsIcon icon={ArrowUp02Icon} />
          </Button>
        </div>
      </form>
    </section>
  )
}
