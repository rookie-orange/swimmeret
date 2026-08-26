import { Settings01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

export function SettingsPage() {
  return (
    <section className="mx-auto flex w-full max-w-2xl flex-1 flex-col pb-12 pt-28">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
          <HugeiconsIcon icon={Settings01Icon} size={20} strokeWidth={1.8} />
        </span>
        <div>
          <p className="text-xs font-medium text-muted-foreground">WORKSPACE</p>
          <h1 className="text-2xl font-semibold tracking-tight">设置</h1>
        </div>
      </div>
      <div className="mt-10 rounded-2xl border border-border bg-card p-5">
        <p className="text-sm font-medium">外观与偏好</p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          主题和模型偏好将在接入真实会话后开放。
        </p>
      </div>
    </section>
  )
}
