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
    <section className="flex min-h-0 flex-1 items-center justify-center py-8">
      <form
        className="w-full max-w-3xl"
        autoComplete="off"
        onSubmit={handleSubmit}
      >
        <div className="flex h-fit flex-col gap-1 rounded-[28px] border p-2">
          <div className='p-2'>
            <textarea
              aria-label="输入消息"
              className="w-full bg-transparent flex-1 resize-none outline-none placeholder:text-muted-foreground"
              onChange={(event) => setValue(event.currentTarget.value)}
              placeholder="给 swimmeret 发消息"
              rows={2}
              value={value}
            />
          </div>
          <div className="flex justify-between">
            <Button
              aria-label="发送消息"
              size="icon"
              type="submit"
              variant="ghost"
            >
              <HugeiconsIcon icon={PlusIcon} className="size-5" />
            </Button>

            <Button aria-label="发送消息" size="icon" type="submit">
              <HugeiconsIcon icon={ArrowUp02Icon} />
            </Button>
          </div>
        </div>
      </form>
    </section>
  )
}
