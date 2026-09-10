'use client'

import { useId, useState, type PointerEvent, type ReactNode } from 'react'
import { ArrowDown01Icon, Tick02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover'
import { hexToHsv, hsvToHex, normalizeColor, type HsvColor } from '@/lib/color'
import { cn } from '@/lib/utils'

// These are selectable document colors, independent of the application's theme.
const presets = [
  '#000000',
  '#4B74FF',
  '#F82D35',
  '#FFE600',
  '#35D91C',
  '#11D9E6',
  '#6826E9',
  '#FFFFFF',
  '#DDE0E4',
  '#C7DBFF',
  '#FBD4D5',
  '#FFF7BB',
  '#DAF8D0',
  '#C6F8FA',
  '#E2D5F7',
]

export function ColorSwatch({
  color,
  stroke = false,
}: {
  color: string | null
  stroke?: boolean
}) {
  return (
    <svg viewBox="0 0 24 24" className="size-6 shrink-0" aria-hidden="true">
      <rect
        x="2"
        y="2"
        width="20"
        height="20"
        rx="5"
        className="fill-background stroke-border"
      />
      {color === 'transparent' ? (
        <path
          d="M5 19 19 5"
          className="stroke-muted-foreground"
          strokeWidth="1.5"
        />
      ) : color === null ? (
        <>
          <path
            d="M3 12h18"
            className="stroke-muted-foreground"
            strokeWidth="2"
          />
          <path
            d="M12 3v18"
            className="stroke-muted-foreground"
            strokeWidth="2"
          />
        </>
      ) : (
        <rect
          x={stroke ? 5 : 2}
          y={stroke ? 5 : 2}
          width={stroke ? 14 : 20}
          height={stroke ? 14 : 20}
          rx={stroke ? 2 : 5}
          fill={stroke ? 'none' : color}
          stroke={stroke ? color : 'none'}
          strokeWidth="4"
        />
      )}
    </svg>
  )
}

export function ColorPicker({
  color,
  onChange,
  label = '颜色',
  disabled = false,
  compact = false,
  quick = false,
  stroke = false,
  allowTransparent = false,
  onInteractionStart,
  children,
}: {
  color: string | null
  onChange: (color: string) => void
  label?: string
  disabled?: boolean
  compact?: boolean
  quick?: boolean
  stroke?: boolean
  allowTransparent?: boolean
  onInteractionStart?: () => void
  children?: ReactNode
}) {
  const id = useId()
  const [isOpen, setIsOpen] = useState(false)
  const [expanded, setExpanded] = useState(!quick)
  const [draft, setDraft] = useState<string | null>(null)
  const [pending, setPending] = useState<{
    color: string
    hsv: HsvColor
  } | null>(null)
  const normalized = color === null ? null : normalizeColor(color)
  const hsv =
    pending?.color === normalized
      ? pending.hsv
      : hexToHsv(normalized ?? '#000000')
  const emit = (next: string, nextHsv?: HsvColor) => {
    if (disabled) return
    setDraft(null)
    setPending({ color: next, hsv: nextHsv ?? hexToHsv(next) })
    if (next !== normalized) onChange(next)
  }
  const updateHsv = (next: HsvColor) => emit(hsvToHex(next), next)
  const changeArea = (event: PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    updateHsv([
      hsv[0],
      Math.min(
        100,
        Math.max(0, ((event.clientX - rect.left) / rect.width) * 100),
      ),
      Math.min(
        100,
        Math.max(0, 100 - ((event.clientY - rect.top) / rect.height) * 100),
      ),
    ])
  }
  const commitInput = () => {
    if (draft === null) return
    const next = normalizeColor(draft)
    if (next && (next !== 'transparent' || allowTransparent)) {
      onInteractionStart?.()
      emit(next)
    }
  }
  const invalid =
    draft !== null &&
    (!normalizeColor(draft) || (!allowTransparent && draft === 'transparent'))
  return (
    <Popover
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open)
        setDraft(null)
        if (open) setExpanded(!quick)
      }}
    >
      <PopoverTrigger
        render={
          <Button
            disabled={disabled}
            aria-label={label}
            title={label}
            variant={compact ? 'ghost' : 'outline'}
            size={compact ? 'icon-sm' : 'default'}
            className={cn(!compact && 'w-full justify-between rounded-xl')}
          />
        }
      >
        <ColorSwatch color={normalized} stroke={stroke} />
        {!compact ? (
          <>
            <span className="flex-1 text-left tabular-nums">
              {normalized === null
                ? '混合'
                : normalized === 'transparent'
                  ? '无颜色'
                  : normalized}
            </span>
            <HugeiconsIcon icon={ArrowDown01Icon} />
          </>
        ) : null}
      </PopoverTrigger>
      <PopoverContent
        className="w-64 gap-3 p-3"
        align="end"
        sideOffset={8}
        onPointerDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key !== 'Escape') event.stopPropagation()
        }}
      >
        <PopoverTitle className="text-sm">{label}</PopoverTitle>
        {expanded ? (
          <>
            <svg
              viewBox="0 0 232 144"
              className="h-36 w-full touch-none cursor-crosshair overflow-hidden rounded-lg"
              aria-label="饱和度与明度取色区域"
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId)
                onInteractionStart?.()
                changeArea(event)
              }}
              onPointerMove={(event) => {
                if (event.currentTarget.hasPointerCapture(event.pointerId))
                  changeArea(event)
              }}
            >
              <defs>
                <linearGradient id={`${id}-s`}>
                  <stop stopColor="#FFFFFF" />
                  <stop offset="1" stopColor={hsvToHex([hsv[0], 100, 100])} />
                </linearGradient>
                <linearGradient id={`${id}-v`} x2="0" y2="1">
                  <stop stopColor="#000000" stopOpacity="0" />
                  <stop offset="1" stopColor="#000000" />
                </linearGradient>
              </defs>
              <rect width="232" height="144" fill={`url(#${id}-s)`} />
              <rect width="232" height="144" fill={`url(#${id}-v)`} />
              <circle
                cx={hsv[1] * 2.32}
                cy={(100 - hsv[2]) * 1.44}
                r="5"
                fill={hsvToHex(hsv)}
                className="stroke-background"
                strokeWidth="2"
              />
            </svg>
            {(['色相', '饱和度', '明度'] as const).map((name, index) => (
              <div key={name} className="flex items-center gap-3">
                <span className="w-10 shrink-0 text-xs text-muted-foreground">
                  {name}
                </span>
                <Slider
                  aria-label={`${label}${name}`}
                  min={0}
                  max={index === 0 ? 360 : 100}
                  value={hsv[index]}
                  onPointerDown={onInteractionStart}
                  onKeyDown={onInteractionStart}
                  onValueChange={(value) => {
                    const next: HsvColor = [...hsv]
                    next[index] = value
                    updateHsv(next)
                  }}
                />
              </div>
            ))}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={id} className="text-xs">
                HEX / HSL
              </Label>
              <Input
                id={id}
                aria-label={`${label}色值`}
                aria-invalid={invalid}
                value={draft ?? normalized ?? ''}
                placeholder="#RRGGBB"
                onChange={(event) => setDraft(event.target.value)}
                onBlur={commitInput}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') commitInput()
                }}
              />
              {invalid ? (
                <p className="text-xs text-destructive">
                  请输入有效的 HEX 或 HSL 色值
                </p>
              ) : null}
            </div>
          </>
        ) : null}
        <div
          className="grid grid-cols-8 gap-1"
          role="group"
          aria-label={`${label}预设`}
        >
          {(allowTransparent ? ['transparent', ...presets] : presets).map(
            (preset) => (
              <Button
                key={preset}
                aria-label={
                  preset === 'transparent'
                    ? `清除${label}`
                    : `${label} ${preset}`
                }
                aria-pressed={normalized === preset}
                className="relative size-6 rounded-md p-0"
                variant="ghost"
                onClick={() => {
                  onInteractionStart?.()
                  emit(preset)
                }}
              >
                <ColorSwatch color={preset} />
                {normalized === preset ? (
                  <span className="absolute inset-1 flex items-center justify-center rounded-full bg-background text-foreground">
                    <HugeiconsIcon icon={Tick02Icon} />
                  </span>
                ) : null}
              </Button>
            ),
          )}
        </div>
        {children}
        {!expanded ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setExpanded(true)}
          >
            自定义颜色
          </Button>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}
export default ColorPicker
