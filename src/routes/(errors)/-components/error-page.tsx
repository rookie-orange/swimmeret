import { Link } from '@tanstack/react-router'
import { Alert02Icon, ArrowLeft01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type ErrorPageProps = {
  code: string
  title: string
  description: string
}

export function ErrorPage({ code, title, description }: ErrorPageProps) {
  return (
    <main className="flex h-full min-h-0 items-center justify-center bg-background px-6 py-12 text-foreground">
      <section className="w-full max-w-lg text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <HugeiconsIcon icon={Alert02Icon} size={30} strokeWidth={1.7} />
        </div>
        <p className="mt-8 text-sm font-semibold tracking-[0.22em] text-muted-foreground">
          {code}
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.03em]">
          {title}
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
          {description}
        </p>
        <Link
          className={cn(
            buttonVariants({ size: 'default', variant: 'outline' }),
            'mt-8 rounded-full',
          )}
          to="/"
        >
          <HugeiconsIcon data-icon="inline-start" icon={ArrowLeft01Icon} />
          返回工作台
        </Link>
      </section>
    </main>
  )
}
