import { Clock01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

export function HistoryPage() {
  return (
    <section className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
        <HugeiconsIcon icon={Clock01Icon} size={26} strokeWidth={1.8} />
      </div>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">历史记录</h1>
      <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
        你开始的对话会出现在这里。当前版本先保留工作流入口。
      </p>
    </section>
  )
}
