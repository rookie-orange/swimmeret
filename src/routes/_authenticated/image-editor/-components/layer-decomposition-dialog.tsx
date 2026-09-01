import { useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import type { LayerResolution } from '@/lib/layer-decomposition'

const RESOLUTION_OPTIONS: Array<{
  label: string
  value: LayerResolution
}> = [
  { label: '自动', value: 'auto' },
  { label: '1K', value: '1K' },
  { label: '1.5K', value: '1.5K' },
  { label: '2K', value: '2K' },
]

interface LayerDecompositionDialogProps {
  error: string | null
  isPending: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (options: {
    prompt: string
    size: LayerResolution
  }) => Promise<void>
  open: boolean
  status: string | null
}

export function LayerDecompositionDialog({
  error,
  isPending,
  onOpenChange,
  onSubmit,
  open,
  status,
}: LayerDecompositionDialogProps) {
  return (
    <Dialog
      onOpenChange={(nextOpen) => {
        if (!isPending) onOpenChange(nextOpen)
      }}
      open={open}
    >
      <DialogContent showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>分离图层</DialogTitle>
          <DialogDescription>设置拆分目标与输出分辨率。</DialogDescription>
        </DialogHeader>

        {open ? (
          <LayerDecompositionForm
            error={error}
            isPending={isPending}
            onCancel={() => onOpenChange(false)}
            onSubmit={onSubmit}
            status={status}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function LayerDecompositionForm({
  error,
  isPending,
  onCancel,
  onSubmit,
  status,
}: Pick<
  LayerDecompositionDialogProps,
  'error' | 'isPending' | 'onSubmit' | 'status'
> & {
  onCancel: () => void
}) {
  const [prompt, setPrompt] = useState('')
  const [size, setSize] = useState<LayerResolution>('auto')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void onSubmit({ prompt, size })
  }

  return (
    <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
      <FieldGroup className="gap-5">
        <Field data-disabled={isPending || undefined}>
          <FieldLabel htmlFor="layer-decomposition-prompt">拆分目标</FieldLabel>
          <Textarea
            disabled={isPending}
            id="layer-decomposition-prompt"
            maxLength={4000}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="留空时自动识别"
            rows={4}
            value={prompt}
          />
          <FieldDescription>
            可指定主体、文字、背景或装饰元素。
          </FieldDescription>
        </Field>

        <Field data-disabled={isPending || undefined}>
          <FieldLabel htmlFor="layer-decomposition-size">输出分辨率</FieldLabel>
          <Select
            disabled={isPending}
            items={RESOLUTION_OPTIONS}
            onValueChange={(value) => {
              if (value) setSize(value)
            }}
            value={size}
          >
            <SelectTrigger className="w-full" id="layer-decomposition-size">
              <SelectValue />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              <SelectGroup>
                {RESOLUTION_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
      </FieldGroup>

      {status ? (
        <p
          aria-live="polite"
          className="flex items-center gap-2 text-sm text-muted-foreground"
          role="status"
        >
          <Spinner />
          {status}
        </p>
      ) : null}
      <FieldError>{error}</FieldError>

      <DialogFooter>
        <Button
          disabled={isPending}
          onClick={onCancel}
          type="button"
          variant="outline"
        >
          取消
        </Button>
        <Button disabled={isPending} type="submit">
          {isPending ? <Spinner data-icon="inline-start" /> : null}
          {isPending ? '正在分离' : '开始分离'}
        </Button>
      </DialogFooter>
    </form>
  )
}
