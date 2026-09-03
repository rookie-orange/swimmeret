import { useLayoutEffect, useRef, useState } from 'react'
import {
  Copy01Icon,
  Delete02Icon,
  Download01Icon,
  LayerBringToFrontIcon,
  LayerSendToBackIcon,
  UngroupLayersIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useEditor, useValue } from 'tldraw'

import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

import { useLayerDecompositionContext } from './layer-decomposition-state'
import { ExportDialog } from './export-dialog'

// 与下方 Tailwind 固定宽高保持同步，用于精确约束画布内定位。
const TOOLBAR_WIDTH = 192
const IMAGE_TOOLBAR_WIDTH = 240
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

export function ElementToolbar() {
  const editor = useEditor()
  const { isOpen, isPending, openForShape } = useLayerDecompositionContext()
  const [isExportOpen, setIsExportOpen] = useState(false)
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
          placement.isImage ? 'w-60 grid-cols-6' : 'w-48 grid-cols-5',
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
      <ExportDialog
        editor={editor}
        onOpenChange={setIsExportOpen}
        open={isExportOpen}
        shapeIds={placement ? [placement.shapeId] : undefined}
      />
    </>
  )
}
