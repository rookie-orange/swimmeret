import { useLayoutEffect, useRef, useState } from 'react'
import {
  AccessibilityIcon,
  Copy01Icon,
  CropIcon,
  Download01Icon,
  ImageDownloadIcon,
  ImageFlipHorizontalIcon,
  ImageFlipVerticalIcon,
  LayerBringToFrontIcon,
  LayerSendToBackIcon,
  ReplaceIcon,
  SlidersHorizontalIcon,
  Tick02Icon,
  UngroupLayersIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useActions, useEditor, useValue } from 'tldraw'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

import { useImageEditorInspector } from './image-editor-inspector-state'
import { useLayerDecompositionContext } from './layer-decomposition-state'
import { ExportDialog } from './export-dialog'
import { ElementMoreMenu } from './element-more-menu'

// 与下方 Tailwind 固定宽高保持同步，用于精确约束画布内定位。
const TOOLBAR_WIDTH = 192
const IMAGE_TOOLBAR_WIDTH = 288
const TOOLBAR_HEIGHT = 40
const TOOLBAR_GAP = 8
const VIEWPORT_MARGIN = 8

const actions = [
  { id: 'duplicate', label: '创建副本', icon: Copy01Icon, imageOnly: false },
  {
    id: 'separate-layers',
    label: '分离图层',
    icon: UngroupLayersIcon,
    imageOnly: true,
  },
  {
    id: 'image-tools',
    label: '图片工具',
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
  { id: 'export', label: '下载', icon: Download01Icon, imageOnly: false },
] as const

function ImageToolsControl({
  disabled,
  isCropping,
  onOpenProperties,
}: {
  disabled: boolean
  isCropping: boolean
  onOpenProperties: () => void
}) {
  const actions = useActions()
  const editor = useEditor()

  if (isCropping) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              aria-label="完成裁剪"
              onClick={() => {
                editor.setCroppingShape(null)
                editor.setCurrentTool('select.idle')
                editor.focus()
              }}
              size="icon-sm"
              variant="secondary"
            />
          }
        >
          <HugeiconsIcon icon={Tick02Icon} />
        </TooltipTrigger>
        <TooltipContent sideOffset={10}>完成裁剪</TooltipContent>
      </Tooltip>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        render={<Button aria-label="图片工具" size="icon-sm" variant="ghost" />}
      >
        <HugeiconsIcon icon={SlidersHorizontalIcon} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" side="top" sideOffset={10}>
        <DropdownMenuGroup>
          <DropdownMenuLabel>图片工具</DropdownMenuLabel>
          <DropdownMenuItem onClick={onOpenProperties}>
            <HugeiconsIcon icon={SlidersHorizontalIcon} />
            调整图片
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              editor.setCurrentTool('select.crop.idle')
              editor.focus()
            }}
          >
            <HugeiconsIcon icon={CropIcon} />
            裁剪
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              void actions['image-replace'].onSelect('image-toolbar')
            }}
          >
            <HugeiconsIcon icon={ReplaceIcon} />
            替换图片
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onOpenProperties}>
            <HugeiconsIcon icon={AccessibilityIcon} />
            替代文本
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={() => {
              void actions['flip-horizontal'].onSelect('image-toolbar')
            }}
          >
            <HugeiconsIcon icon={ImageFlipHorizontalIcon} />
            水平翻转
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              void actions['flip-vertical'].onSelect('image-toolbar')
            }}
          >
            <HugeiconsIcon icon={ImageFlipVerticalIcon} />
            垂直翻转
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              void actions['download-original'].onSelect('image-toolbar')
            }}
          >
            <HugeiconsIcon icon={ImageDownloadIcon} />
            下载原图
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function ElementToolbar() {
  const editor = useEditor()
  const { setActiveTab } = useImageEditorInspector()
  const { isOpen, isPending, openForShape } = useLayerDecompositionContext()
  const [isExportOpen, setIsExportOpen] = useState(false)
  const toolbarRef = useRef<HTMLDivElement>(null)
  const placement = useValue(
    'image editor element toolbar placement',
    () => {
      const selectedIds = editor.getSelectedShapeIds()
      if (
        selectedIds.length === 0 ||
        editor.getEditingShapeId() ||
        editor.getCurrentToolId() !== 'select'
      ) {
        return null
      }

      const shape = editor.getShape(selectedIds[0])
      if (!shape) return null

      const isImage = selectedIds.length === 1 && shape.type === 'image'
      const canEdit =
        !editor.getInstanceState().isReadonly &&
        editor
          .getSelectedShapes()
          .some((selected) => !editor.isShapeOrAncestorLocked(selected))
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
        shapeIds: selectedIds,
        isImage,
        canEdit,
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

  const isCropping = useValue(
    'image editor is cropping',
    () => editor.isIn('select.crop.'),
    [editor],
  )

  if (!placement || isOpen) return null

  const runAction = (action: (typeof actions)[number]['id']) => {
    const shapeIds = placement.shapeIds.filter((id) => editor.getShape(id))
    if (shapeIds.length === 0) return

    if (action === 'separate-layers') {
      if (placement.isImage && placement.canEdit) openForShape(shapeIds[0])
      return
    }

    if (action === 'export') {
      setIsExportOpen(true)
      return
    }

    if (!placement.canEdit || isCropping) return

    editor.markHistoryStoppingPoint(`element toolbar ${action}`)

    switch (action) {
      case 'duplicate':
        editor.duplicateShapes(shapeIds, { x: 24, y: 24 })
        break
      case 'front':
        editor.bringToFront(shapeIds)
        break
      case 'back':
        editor.sendToBack(shapeIds)
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
        className="pointer-events-auto absolute top-0 left-0 flex flex-col items-start gap-2"
        ref={toolbarRef}
      >
        <div
          aria-label={
            placement.shapeIds.length > 1 ? '多选元素操作' : '元素操作'
          }
          className={cn(
            'grid h-10 gap-1 rounded-xl border border-border bg-card p-1 shadow-xl shadow-foreground/10',
            placement.isImage ? 'w-72 grid-cols-7' : 'w-48 grid-cols-5',
          )}
          onPointerDown={(event) => event.stopPropagation()}
          role="toolbar"
        >
          {visibleActions.map((action) =>
            action.id === 'image-tools' ? (
              <ImageToolsControl
                disabled={!placement.canEdit}
                isCropping={isCropping}
                key={action.id}
                onOpenProperties={() => setActiveTab('properties')}
              />
            ) : (
              <Tooltip key={action.id}>
                <TooltipTrigger
                  render={
                    <Button
                      aria-label={action.label}
                      disabled={
                        action.id !== 'export' &&
                        (!placement.canEdit ||
                          isCropping ||
                          (action.id === 'separate-layers' && isPending))
                      }
                      onClick={() => runAction(action.id)}
                      size="icon-sm"
                      variant="ghost"
                    />
                  }
                >
                  <HugeiconsIcon icon={action.icon} />
                </TooltipTrigger>
                <TooltipContent sideOffset={10}>{action.label}</TooltipContent>
              </Tooltip>
            ),
          )}
          <ElementMoreMenu
            disabled={isCropping}
            key={placement.shapeIds.join(',')}
            onDuplicate={() => runAction('duplicate')}
            onExport={() => setIsExportOpen(true)}
            onOpenProperties={() => setActiveTab('properties')}
          />
        </div>
      </div>
      <ExportDialog
        editor={editor}
        onOpenChange={setIsExportOpen}
        open={isExportOpen}
        shapeIds={placement.shapeIds}
      />
    </>
  )
}
