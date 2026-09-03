import { Clock01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

export function HistoryPage() {
  return (
    <section className="flex h-full min-h-0 flex-col items-center justify-center py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
        <HugeiconsIcon icon={Clock01Icon} size={26} />
      </div>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">资源管理</h1>
      <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
        你的文案、图片和未来生成的视频都会集中出现在这里。
      </p>
    </section>
  )
}
