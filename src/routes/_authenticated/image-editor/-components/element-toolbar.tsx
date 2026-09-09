import { useLayoutEffect, useRef, useState } from 'react'
import {
  Copy01Icon,
  Delete02Icon,
  Download01Icon,
  LayerBringToFrontIcon,
  LayerSendToBackIcon,
  SlidersHorizontalIcon,
  UngroupLayersIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { RotateCcw } from 'lucide-react'
import { useEditor, useValue } from 'tldraw'
import type { TLImageShape, TLShapeId } from 'tldraw'

import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
  DEFAULT_IMAGE_ADJUSTMENTS,
  getImageAdjustments,
  type ImageAdjustments,
} from '@/lib/project-image-shape'

import { useLayerDecompositionContext } from './layer-decomposition-state'
import { ExportDialog } from './export-dialog'

// 与下方 Tailwind 固定宽高保持同步，用于精确约束画布内定位。
const TOOLBAR_WIDTH = 192
const IMAGE_TOOLBAR_WIDTH = 280
const TOOLBAR_HEIGHT = 40
const TOOLBAR_GAP = 8
const VIEWPORT_MARGIN = 8

const actions = [
  { id: 'copy', label: '复制', icon: Copy01Icon, imageOnly: false },
  {
    id: 'separate-layers',
    label: '分离图层',
    icon: UngroupLayersIcon,
    imageOnly: true,
  },
  {
    id: 'adjust',
    label: '调整',
    icon: SlidersHorizontalIcon,
    imageOnly: true,
  },
  {
    id: 'front',
    label: '置于顶层',
    icon: LayerBringToFrontIcon,
    imageOnly: false,
  },
  {
    id: 'back',
    label: '置于底层',
    icon: LayerSendToBackIcon,
    imageOnly: false,
  },
  { id: 'export', label: '导出', icon: Download01Icon, imageOnly: false },
  { id: 'delete', label: '删除', icon: Delete02Icon, imageOnly: false },
] as const

const adjustmentLabels: Array<{
  key: keyof ImageAdjustments
  label: string
}> = [
  { key: 'brightness', label: '亮度' },
  { key: 'exposure', label: '曝光' },
  { key: 'contrast', label: '对比度' },
  { key: 'saturation', label: '饱和度' },
  { key: 'vibrance', label: '鲜艳度' },
  { key: 'vignette', label: '暗角' },
]

function ImageAdjustPanel({ shapeId }: { shapeId: TLImageShape['id'] }) {
  const editor = useEditor()
  const adjustments = useValue(
    'image editor adjustments',
    () => {
      const shape = editor.getShape<TLImageShape>(shapeId)
      return shape ? getImageAdjustments(shape) : DEFAULT_IMAGE_ADJUSTMENTS
    },
    [editor, shapeId],
  )

  const updateAdjustment = (key: keyof ImageAdjustments, value: number) => {
    const shape = editor.getShape<TLImageShape>(shapeId)
    if (!shape) return
    editor.updateShape({
      id: shape.id,
      type: shape.type,
      meta: {
        ...shape.meta,
        imageAdjustments: {
          ...getImageAdjustments(shape),
          [key]: value,
        },
      },
    })
  }

  return (
    <div
      className="absolute top-12 left-0 z-30 flex w-72 flex-col gap-3 rounded-xl border border-border bg-card p-3 shadow-xl shadow-foreground/10"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">图片调整</p>
        <Button
          aria-label="重置图片调整"
          onClick={() => {
            const shape = editor.getShape<TLImageShape>(shapeId)
            if (!shape) return
            editor.markHistoryStoppingPoint('reset image adjustments')
            editor.updateShape({
              id: shape.id,
              type: shape.type,
              meta: {
                ...shape.meta,
                imageAdjustments: { ...DEFAULT_IMAGE_ADJUSTMENTS },
              },
            })
            editor.focus()
          }}
          size="icon-sm"
          title="重置图片调整"
          variant="ghost"
        >
          <RotateCcw />
        </Button>
      </div>
      <div className="grid gap-2">
        {adjustmentLabels.map(({ key, label }) => (
          <label
            className="grid grid-cols-[4rem_1fr_2rem] items-center gap-2"
            key={key}
          >
            <span className="text-xs text-muted-foreground">{label}</span>
            <input
              aria-label={label}
              className="h-4 w-full accent-primary"
              max="2"
              min={key === 'vignette' ? 0 : -2}
              onChange={(event) =>
                updateAdjustment(key, Number(event.target.value))
              }
              onPointerDown={() =>
                editor.markHistoryStoppingPoint(`adjust image ${key}`)
              }
              step="1"
              type="range"
              value={adjustments[key]}
            />
            <output className="text-right text-xs tabular-nums text-muted-foreground">
              {adjustments[key]}
            </output>
          </label>
        ))}
      </div>
    </div>
  )
}

export function ElementToolbar() {
  const editor = useEditor()
  const { isOpen, isPending, openForShape } = useLayerDecompositionContext()
  const [isExportOpen, setIsExportOpen] = useState(false)
  const [adjustmentShapeId, setAdjustmentShapeId] = useState<TLShapeId | null>(
    null,
  )
  const toolbarRef = useRef<HTMLDivElement>(null)
  const placement = useValue(
    'image editor element toolbar placement',
    () => {
      const selectedIds = editor.getSelectedShapeIds()
      if (
        selectedIds.length !== 1 ||
        editor.getEditingShapeId() ||
        editor.getCurrentToolId() !== 'select'
      ) {
        return null
      }

      const shape = editor.getShape(selectedIds[0])
      if (!shape) return null

      const isImage = shape.type === 'image'
      const toolbarWidth = isImage ? IMAGE_TOOLBAR_WIDTH : TOOLBAR_WIDTH
      const bounds = editor.getSelectionRotatedScreenBounds()
      if (!bounds) return null

      const viewport = editor.getViewportScreenBounds()
      const selectionTop = bounds.minY - viewport.minY
      const selectionBottom = bounds.maxY - viewport.minY
      const hasRoomAbove =
        selectionTop >= TOOLBAR_HEIGHT + TOOLBAR_GAP + VIEWPORT_MARGIN
      const unclampedTop = hasRoomAbove
        ? selectionTop - TOOLBAR_HEIGHT - TOOLBAR_GAP
        : selectionBottom + TOOLBAR_GAP
      const maxLeft = Math.max(
        VIEWPORT_MARGIN,
        viewport.width - toolbarWidth - VIEWPORT_MARGIN,
      )
      const maxTop = Math.max(
        VIEWPORT_MARGIN,
        viewport.height - TOOLBAR_HEIGHT - VIEWPORT_MARGIN,
      )

      return {
        shapeId: selectedIds[0],
        isImage,
        x: Math.min(
          Math.max(
            bounds.center.x - viewport.minX - toolbarWidth / 2,
            VIEWPORT_MARGIN,
          ),
          maxLeft,
        ),
        y: Math.min(Math.max(unclampedTop, VIEWPORT_MARGIN), maxTop),
      }
    },
    [editor],
  )

  useLayoutEffect(() => {
    if (!placement || !toolbarRef.current) return

    // 高频相机与形状变化只更新 DOM 变换，不进入 React 本地状态。
    toolbarRef.current.style.transform = `translate3d(${placement.x}px, ${placement.y}px, 0)`
  }, [placement])

  if (!placement || isOpen) return null

  const runAction = (action: (typeof actions)[number]['id']) => {
    const shapeId = placement.shapeId
    if (!editor.getShape(shapeId)) return

    if (action === 'separate-layers') {
      openForShape(shapeId)
      return
    }

    if (action === 'export') {
      setIsExportOpen(true)
      return
    }

    if (action === 'adjust') {
      setAdjustmentShapeId((current) => (current === shapeId ? null : shapeId))
      return
    }

    editor.markHistoryStoppingPoint(`element toolbar ${action}`)

    switch (action) {
      case 'copy':
        editor.duplicateShapes([shapeId], { x: 24, y: 24 })
        break
      case 'front':
        editor.bringToFront([shapeId])
        break
      case 'back':
        editor.sendToBack([shapeId])
        break
      case 'delete':
        editor.deleteShapes([shapeId])
        break
    }

    editor.focus()
  }

  const visibleActions = actions.filter(
    (action) => !action.imageOnly || placement.isImage,
  )

  return (
    <>
      <div
        aria-label="元素操作"
        className={cn(
          'pointer-events-auto absolute top-0 left-0 grid h-10 gap-1 rounded-xl border border-border bg-card p-1 shadow-xl shadow-foreground/10',
          placement.isImage ? 'w-72 grid-cols-7' : 'w-48 grid-cols-5',
        )}
        onPointerDown={(event) => event.preventDefault()}
        ref={toolbarRef}
        role="toolbar"
      >
        {visibleActions.map((action) => (
          <Tooltip key={action.id}>
            <TooltipTrigger
              render={
                <Button
                  aria-label={action.label}
                  disabled={action.id === 'separate-layers' && isPending}
                  onClick={() => runAction(action.id)}
                  size="icon-sm"
                  variant={action.id === 'delete' ? 'destructive' : 'ghost'}
                />
              }
            >
              <HugeiconsIcon icon={action.icon} />
            </TooltipTrigger>
            <TooltipContent sideOffset={10}>{action.label}</TooltipContent>
          </Tooltip>
        ))}
      </div>
      {placement.isImage && adjustmentShapeId === placement.shapeId ? (
        <ImageAdjustPanel shapeId={placement.shapeId} />
      ) : null}
      <ExportDialog
        editor={editor}
        onOpenChange={setIsExportOpen}
        open={isExportOpen}
        shapeIds={placement ? [placement.shapeId] : undefined}
      />
    </>
  )
}
