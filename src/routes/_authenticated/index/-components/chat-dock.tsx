import { useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowUp02Icon, Attachment01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export function ChatDock() {
  const [message, setMessage] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!message.trim()) return
    setMessage('')
  }

  return (
    <div className="col-start-1 row-start-2 flex min-w-0 justify-center md:col-start-2">
      <div className="w-full max-w-2xl rounded-[28px] border border-border bg-card/95 p-1.5 shadow-2xl shadow-foreground/10 backdrop-blur-xl">
        <form
          className="flex h-11 min-w-0 items-center gap-1"
          onSubmit={handleSubmit}
        >
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  aria-label="添加附件"
                  className="shrink-0 rounded-full text-muted-foreground"
                  size="icon"
                  type="button"
                  variant="ghost"
                />
              }
            >
              <HugeiconsIcon icon={Attachment01Icon} />
            </TooltipTrigger>
            <TooltipContent>添加参考图</TooltipContent>
          </Tooltip>
          <Input
            aria-label="输入消息"
            className="h-11 min-w-0 flex-1 rounded-full border-0 bg-transparent px-3 shadow-none focus-visible:ring-0"
            onChange={(event) => setMessage(event.currentTarget.value)}
            placeholder="描述一个想法，开始创作……"
            value={message}
          />
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  aria-label="发送消息"
                  className="shrink-0 rounded-full"
                  size="icon-lg"
                  type="submit"
                />
              }
            >
              <HugeiconsIcon icon={ArrowUp02Icon} />
            </TooltipTrigger>
            <TooltipContent>发送消息</TooltipContent>
          </Tooltip>
        </form>
      </div>
    </div>
  )
}
