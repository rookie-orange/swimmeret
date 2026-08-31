import { useLayoutEffect, useRef } from 'react'
import {
  Copy01Icon,
  Delete02Icon,
  LayerBringToFrontIcon,
  LayerSendToBackIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useEditor, useValue } from 'tldraw'

import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

const TOOLBAR_WIDTH = 160
const TOOLBAR_HEIGHT = 40
const TOOLBAR_GAP = 8
const VIEWPORT_MARGIN = 8

const actions = [
  { id: 'copy', label: '复制', icon: Copy01Icon },
  { id: 'front', label: '置于顶层', icon: LayerBringToFrontIcon },
  { id: 'back', label: '置于底层', icon: LayerSendToBackIcon },
  { id: 'delete', label: '删除', icon: Delete02Icon },
] as const

export function ElementToolbar() {
  const editor = useEditor()
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
        viewport.width - TOOLBAR_WIDTH - VIEWPORT_MARGIN,
      )
      const maxTop = Math.max(
        VIEWPORT_MARGIN,
        viewport.height - TOOLBAR_HEIGHT - VIEWPORT_MARGIN,
      )

      return {
        shapeId: selectedIds[0],
        x: Math.min(
          Math.max(
            bounds.center.x - viewport.minX - TOOLBAR_WIDTH / 2,
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

  if (!placement) return null

  const runAction = (action: (typeof actions)[number]['id']) => {
    const shapeId = placement.shapeId
    if (!editor.getShape(shapeId)) return

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

  return (
    <div
      aria-label="元素操作"
      className="pointer-events-auto absolute top-0 left-0 grid h-10 w-40 grid-cols-4 gap-1 rounded-xl border border-border bg-card p-1 shadow-xl shadow-foreground/10"
      onPointerDown={(event) => event.preventDefault()}
      ref={toolbarRef}
      role="toolbar"
    >
      {actions.map((action) => (
        <Tooltip key={action.id}>
          <TooltipTrigger
            render={
              <Button
                aria-label={action.label}
                onClick={() => runAction(action.id)}
                size="icon-sm"
                variant={action.id === 'delete' ? 'destructive' : 'ghost'}
              />
            }
          >
            <HugeiconsIcon icon={action.icon} strokeWidth={1.8} />
          </TooltipTrigger>
          <TooltipContent>{action.label}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  )
}
