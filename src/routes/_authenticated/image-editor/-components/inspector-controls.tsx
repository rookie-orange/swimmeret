import { useId, useState, type ReactNode, type ComponentProps } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'

import { Button } from '@/components/ui/button'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@/components/ui/input-group'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export function InspectorSection({
  title,
  children,
  action,
}: {
  title?: string
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <>
      <section className="flex flex-col gap-4 px-5 py-5">
        {title ? (
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">{title}</h3>
            {action}
          </div>
        ) : null}
        {children}
      </section>
      <Separator />
    </>
  )
}

export function InspectorAction({
  label,
  icon,
  ...props
}: Omit<ComponentProps<typeof Button>, 'children'> & {
  label: string
  icon: ComponentProps<typeof HugeiconsIcon>['icon']
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            aria-label={label}
            size="icon-sm"
            variant="ghost"
            {...props}
          />
        }
      >
        <HugeiconsIcon icon={icon} />
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

export function InspectorNumber({
  label,
  suffix,
  value,
  min,
  max,
  disabled,
  onCommit,
}: {
  label: string
  suffix: string
  value: number | null
  min?: number
  max?: number
  disabled?: boolean
  onCommit: (value: number) => void
}) {
  const id = useId()
  const [draft, setDraft] = useState<string | null>(null)
  const displayValue =
    value === null ? '' : String(Math.round(value * 100) / 100)
  const commit = () => {
    if (draft !== null && draft.trim() !== '') {
      const parsed = Number(draft)
      if (Number.isFinite(parsed) && parsed !== value)
        onCommit(Math.min(max ?? Infinity, Math.max(min ?? -Infinity, parsed)))
    }
    setDraft(null)
  }
  return (
    <InputGroup className="rounded-xl" data-disabled={disabled}>
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <InputGroupInput
        id={id}
        aria-label={label}
        disabled={disabled}
        type="number"
        step="any"
        min={min}
        max={max}
        placeholder="混合"
        value={draft ?? displayValue}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur()
          if (event.key === 'Escape') {
            setDraft(null)
            event.stopPropagation()
          }
        }}
      />
      <InputGroupAddon align="inline-end">
        <InputGroupText>{suffix}</InputGroupText>
      </InputGroupAddon>
    </InputGroup>
  )
}
