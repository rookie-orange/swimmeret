import { useId } from 'react'
import {
  Add01Icon,
  ArrowDown01Icon,
  ArrowUp02Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useEditor, type TLImageShape } from 'tldraw'

import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from '@/components/ui/input-group'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useImageGenerationContext } from '@/lib/image-generation-context'
import {
  getGenerationAspect,
  getGenerationRatioLabel,
  getImageGenerationDraft,
  IMAGE_GENERATION_RATIOS,
  IMAGE_GENERATION_SIZES,
  type ImageGenerationDraft,
} from '@/lib/project-image-generation'
import { cn } from '@/lib/utils'

const ratioIconClasses = {
  auto: 'size-5',
  '1:1': 'size-5',
  '2:3': 'h-6 w-4',
  '3:2': 'h-4 w-6',
  '3:4': 'h-6 w-4.5',
  '4:3': 'h-4.5 w-6',
  '9:16': 'h-6 w-3.5',
  '16:9': 'h-3.5 w-6',
} as const

export function GenerationForm({ shape }: { shape: TLImageShape }) {
  const editor = useEditor()
  const { generate } = useImageGenerationContext()
  const draft = getImageGenerationDraft(shape)!
  const inputId = useId()
  const tooLong = Array.from(draft.prompt.trim()).length > 4000
  const update = (patch: Partial<ImageGenerationDraft>) => {
    const current = editor.getShape<TLImageShape>(shape.id)
    const currentDraft = getImageGenerationDraft(current)
    if (
      !current ||
      !currentDraft ||
      editor.getIsReadonly() ||
      editor.isShapeOrAncestorLocked(current)
    )
      return
    const ratio = patch.aspectRatio
      ? getGenerationAspect(patch.aspectRatio)
      : null
    const edge = Math.max(current.props.w, current.props.h)
    const nextW = ratio ? edge * Math.min(ratio, 1) : current.props.w
    const nextH = ratio ? edge / Math.max(ratio, 1) : current.props.h
    editor.updateShape({
      id: shape.id,
      type: 'image',
      ...(ratio
        ? {
            x: current.x + (current.props.w - nextW) / 2,
            y: current.y + (current.props.h - nextH) / 2,
            props: {
              w: nextW,
              h: nextH,
            },
          }
        : {}),
      meta: {
        ...current.meta,
        imageGeneration: { ...currentDraft, ...patch, error: null },
      },
    })
  }
  return (
    <form
      aria-label="文生图"
      onSubmit={(event) => {
        event.preventDefault()
        if (!tooLong) void generate(shape.id)
      }}
      onPointerDown={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        event.stopPropagation()
        if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229)
          return
        if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
          event.preventDefault()
          event.currentTarget.requestSubmit()
        }
      }}
      onKeyUp={(event) => event.stopPropagation()}
    >
      <FieldGroup>
        <Field data-invalid={tooLong || undefined}>
          <FieldLabel className="sr-only" htmlFor={inputId}>
            图片描述
          </FieldLabel>
          <InputGroup className="rounded-3xl border-border bg-card shadow-sm has-[[data-slot=input-group-control]:focus-visible]:!border-border has-[[data-slot=input-group-control]:focus-visible]:!ring-0">
            <InputGroupTextarea
              id={inputId}
              aria-invalid={tooLong || undefined}
              className="min-h-24 px-3 pt-3 text-sm placeholder:text-muted-foreground/60 focus-visible:border-0 focus-visible:outline-none focus-visible:ring-0"
              placeholder="描述你的灵感，支持 @ 上传图片、选择技能以及 Agent"
              value={draft.prompt}
              onChange={(event) => update({ prompt: event.target.value })}
            />
            <InputGroupAddon
              align="block-end"
              className="flex-wrap px-2 pb-2 pt-1"
            >
              <InputGroupButton
                size="icon-sm"
                variant="secondary"
                aria-label="添加内容"
                className="rounded-full"
              >
                <HugeiconsIcon icon={Add01Icon} />
              </InputGroupButton>
              <Popover>
                <PopoverTrigger
                  render={
                    <InputGroupButton
                      size="sm"
                      variant="ghost"
                      aria-label="生成设置"
                      className="rounded-full px-3 font-normal"
                    />
                  }
                >
                  {draft.size} · {getGenerationRatioLabel(draft.aspectRatio)}
                  <HugeiconsIcon
                    data-icon="inline-end"
                    icon={ArrowDown01Icon}
                  />
                </PopoverTrigger>
                <PopoverContent
                  side="top"
                  align="start"
                  positionerClassName="z-[400]"
                  className="w-[min(23rem,calc(100vw-2rem))] rounded-3xl border-border bg-card p-4 shadow-xl"
                  onPointerDown={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  <FieldGroup className="gap-5">
                    <Field className="gap-2">
                      <FieldLabel className="text-base font-semibold">
                        比例
                      </FieldLabel>
                      <ToggleGroup
                        aria-label="比例"
                        spacing={1}
                        className="grid w-full grid-cols-4 rounded-3xl bg-muted p-1"
                        value={[draft.aspectRatio]}
                        onValueChange={(values) => {
                          const ratio = IMAGE_GENERATION_RATIOS.find(
                            (ratio) => ratio === values[0],
                          )
                          if (ratio) update({ aspectRatio: ratio })
                        }}
                      >
                        {IMAGE_GENERATION_RATIOS.map((ratio) => (
                          <ToggleGroupItem
                            className="h-16 flex-col gap-1.5 rounded-2xl bg-transparent px-1 text-sm font-normal text-muted-foreground transition-colors aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-sm aria-pressed:ring-1 aria-pressed:ring-border hover:bg-card/70 hover:text-foreground"
                            key={ratio}
                            value={ratio}
                            aria-label={getGenerationRatioLabel(ratio)}
                          >
                            <span
                              aria-hidden
                              className={cn(
                                'rounded-xs border border-current',
                                ratioIconClasses[ratio],
                              )}
                            />
                            {getGenerationRatioLabel(ratio)}
                          </ToggleGroupItem>
                        ))}
                      </ToggleGroup>
                    </Field>
                    <Field className="gap-2">
                      <FieldLabel className="text-base font-semibold">
                        分辨率
                      </FieldLabel>
                      <ToggleGroup
                        aria-label="分辨率"
                        spacing={1}
                        className="grid w-full grid-cols-3 rounded-3xl bg-muted p-1"
                        value={[draft.size]}
                        onValueChange={(values) => {
                          const size = IMAGE_GENERATION_SIZES.find(
                            (size) => size === values[0],
                          )
                          if (size) update({ size })
                        }}
                      >
                        {IMAGE_GENERATION_SIZES.map((size) => (
                          <ToggleGroupItem
                            className="h-10 rounded-2xl bg-transparent text-sm font-normal text-muted-foreground transition-colors aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-sm aria-pressed:ring-1 aria-pressed:ring-border hover:bg-card/70 hover:text-foreground"
                            key={size}
                            value={size}
                          >
                            {size}
                          </ToggleGroupItem>
                        ))}
                      </ToggleGroup>
                    </Field>
                  </FieldGroup>
                </PopoverContent>
              </Popover>
              <span className="flex-1" />
              <InputGroupButton
                type="submit"
                size="icon-sm"
                variant="default"
                aria-label="生成图片"
                disabled={!draft.prompt.trim() || tooLong}
              >
                <HugeiconsIcon icon={ArrowUp02Icon} />
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          {tooLong || draft.error ? (
            <p role="alert" className="text-xs text-destructive">
              {tooLong ? '图片描述不能超过 4000 个字符' : draft.error}
            </p>
          ) : null}
        </Field>
      </FieldGroup>
    </form>
  )
}
