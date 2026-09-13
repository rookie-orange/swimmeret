import { lazy, Suspense } from 'react'
import { AiImageIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { HTMLContainer, type TLImageShape } from 'tldraw'
import { useReducedMotion } from 'motion/react'

import { Spinner } from '@/components/ui/spinner'
import { useImageGenerationContext } from '@/lib/image-generation-context'
import {
  getGenerationRatioLabel,
  getImageGenerationDraft,
} from '@/lib/project-image-generation'

const Grainient = lazy(() => import('@/components/grainient'))

export function ImageGenerationPlaceholder({ shape }: { shape: TLImageShape }) {
  const { pendingIds } = useImageGenerationContext()
  const draft = getImageGenerationDraft(shape)!
  const pending = pendingIds.includes(shape.id)
  const reducedMotion = useReducedMotion()

  return (
    <HTMLContainer className="size-full">
      <div className="absolute -top-7 left-0 flex w-full items-center justify-between gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <HugeiconsIcon icon={AiImageIcon} className="size-4" />
          图片生成
        </span>
        <span>
          {draft.size} · {getGenerationRatioLabel(draft.aspectRatio)}
        </span>
      </div>
      <div
        aria-label={pending ? '正在生成图片' : '文生图占位图'}
        className="relative flex size-full items-center justify-center overflow-hidden border border-border bg-card"
      >
        {pending ? (
          <>
            <div className="absolute inset-0 bg-linear-to-br from-ai-start via-ai-middle to-ai-end">
              <Suspense fallback={null}>
                <Grainient
                  className="size-full"
                  timeSpeed={reducedMotion ? 0 : 0.35}
                />
              </Suspense>
            </div>
            <div
              role="status"
              className="relative flex items-center gap-2 rounded-full border border-border bg-card/90 px-4 py-2 text-sm text-card-foreground shadow-sm"
            >
              <Spinner />
              正在生成图片…
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <HugeiconsIcon className="size-8" icon={AiImageIcon} />
            <span className="text-sm">
              {draft.error ? '生成失败，点击重试' : '点击描述你想要的画面'}
            </span>
          </div>
        )}
      </div>
    </HTMLContainer>
  )
}
