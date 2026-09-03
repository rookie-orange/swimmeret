import { useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowRight01Icon, Key01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { Button } from '@/components/ui/button'
import { loginWithKey } from '@/lib/auth'

type LoginFormProps = {
  onSuccess: () => void
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [key, setKey] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const didLogin = loginWithKey(key)

    if (!didLogin) {
      setError('请输入有效的 key')
      return
    }

    setError('')
    onSuccess()
  }

  return (
    <section className="rounded-3xl border border-border bg-card/80 p-7 shadow-2xl shadow-primary/5 backdrop-blur-sm sm:p-9">
      <div className="mb-9 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold tracking-tight">swimmeret</p>
          <h1 className="mt-6 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
            欢迎回来
          </h1>
          <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
            输入访问 key，进入你的 AI 工作台。
          </p>
        </div>
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          <HugeiconsIcon icon={Key01Icon} size={22} />
        </div>
      </div>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <label
          className="flex flex-col gap-2 text-sm font-medium"
          htmlFor="access-key"
        >
          Access key
          <input
            aria-describedby={error ? 'key-error' : undefined}
            aria-invalid={Boolean(error)}
            autoComplete="off"
            className="h-12 rounded-2xl border border-input bg-background px-4 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-4 focus:ring-ring/15"
            id="access-key"
            onChange={(event) => {
              setKey(event.target.value)
              if (error) setError('')
            }}
            placeholder="输入你的 key"
            type="password"
            value={key}
          />
        </label>
        {error ? (
          <p className="text-sm text-destructive" id="key-error">
            {error}
          </p>
        ) : null}
        <Button
          className="mt-2 h-12 justify-between rounded-2xl px-4"
          type="submit"
        >
          <span>进入工作台</span>
          <HugeiconsIcon icon={ArrowRight01Icon} data-icon="inline-end" />
        </Button>
      </form>
    </section>
  )
}
