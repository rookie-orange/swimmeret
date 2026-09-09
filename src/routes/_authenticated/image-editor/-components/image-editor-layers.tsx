import { useMemo } from 'react'
import {
  ImageAdd01Icon,
  Layers01Icon,
  PencilEdit01Icon,
  ShapesIcon,
  TextIcon,
  UngroupLayersIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Eye, EyeOff, GripVertical, Lock, Pencil, Unlock } from 'lucide-react'
import {
  computed,
  type Editor,
  type TLShape,
  type TLShapeId,
  useValue,
} from 'tldraw'

import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

import { useLayerDecompositionContext } from './layer-decomposition-state'

interface ImageEditorLayersProps {
  editor: Editor | null
  onAddImages: () => void
}

interface LayerItem {
  id: TLShapeId
  name: string
  type: string
  depth: number
  visible: boolean
  locked: boolean
}

function isDecompositionGroup(shape: TLShape) {
  return shape.type === 'group' && shape.meta.decompositionGroup === true
}

function getLayerType(shapeType: string) {
  switch (shapeType) {
    case 'image':
      return '图片'
    case 'text':
      return '文字'
    case 'draw':
      return '绘制'
    default:
      return '形状'
  }
}

function getLayerIcon(shapeType: string) {
  switch (shapeType) {
    case 'image':
      return ImageAdd01Icon
    case 'text':
      return TextIcon
    case 'draw':
      return PencilEdit01Icon
    default:
      return ShapesIcon
  }
}

function getLayerDepth(editor: Editor, shape: TLShape) {
  let depth = 0
  let parentId = shape.parentId
  while (parentId !== editor.getCurrentPageId() && depth < 20) {
    const parent = editor.getShape(parentId)
    if (!parent) break
    depth += 1
    parentId = parent.parentId
  }
  return depth
}

function areLayersEqual(previous: LayerItem[], next: LayerItem[]) {
  return (
    previous.length === next.length &&
    previous.every(
      (layer, index) =>
        layer.id === next[index]?.id &&
        layer.name === next[index]?.name &&
        layer.type === next[index]?.type &&
        layer.visible === next[index]?.visible &&
        layer.locked === next[index]?.locked,
    )
  )
}

function ConnectedLayers({ editor }: { editor: Editor }) {
  const layersSignal = useMemo(
    () =>
      computed(
        'image editor layer metadata',
        () => {
          const shapes = editor.getCurrentPageShapesSorted()
          const layers: LayerItem[] = []

          for (let index = shapes.length - 1; index >= 0; index -= 1) {
            const shape = shapes[index]
            if (isDecompositionGroup(shape)) continue
            const type = getLayerType(shape.type)
            let name =
              typeof shape.meta.name === 'string' && shape.meta.name.trim()
                ? shape.meta.name.trim()
                : type

            if (
              name === type &&
              shape.type === 'image' &&
              shape.props.assetId
            ) {
              const asset = editor.getAsset(shape.props.assetId)
              name = asset?.type === 'image' ? asset.props.name || type : type
            } else if (name === type) {
              const text = editor.getShapeUtil(shape).getText(shape)?.trim()
              if (text) name = text
            }

            layers.push({
              id: shape.id,
              name,
              type: shape.type,
              depth: getLayerDepth(editor, shape),
              visible: !editor.isShapeHidden(shape),
              locked: editor.isShapeOrAncestorLocked(shape),
            })
          }

          return layers
        },
        { isEqual: areLayersEqual },
      ),
    [editor],
  )
  const layers = useValue(layersSignal)
  const selectedShapeId = useValue(
    'image editor selected layer',
    () => {
      const selectedIds = editor.getSelectedShapeIds()
      return selectedIds.length === 1 ? selectedIds[0] : null
    },
    [editor],
  )

  if (layers.length === 0) {
    return (
      <div className="flex min-h-32 flex-col items-center justify-center gap-2 px-6 text-center">
        <HugeiconsIcon
          className="text-muted-foreground"
          icon={Layers01Icon}
          strokeWidth={1.6}
        />
        <p className="text-sm font-medium">暂无画布元素</p>
        <p className="text-xs text-muted-foreground">从底部素材入口添加图片</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-col gap-1 overflow-y-auto px-2 pb-3">
      {layers.map((layer) => (
        <div
          className={cn(
            'group flex items-center gap-1 rounded-xl border border-transparent px-1',
            selectedShapeId === layer.id && 'border-border bg-secondary',
            !layer.visible && 'opacity-60',
            layer.depth === 1 && 'ml-3',
            layer.depth >= 2 && 'ml-6',
          )}
          draggable
          key={layer.id}
          onDragStart={(event) => {
            event.dataTransfer.effectAllowed = 'move'
            event.dataTransfer.setData('text/plain', layer.id)
          }}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault()
            const draggedId = event.dataTransfer.getData(
              'text/plain',
            ) as TLShapeId
            const targetIndex = layers.findIndex((item) => item.id === layer.id)
            const draggedIndex = layers.findIndex(
              (item) => item.id === draggedId,
            )
            if (
              draggedIndex < 0 ||
              targetIndex < 0 ||
              draggedIndex === targetIndex
            )
              return
            const steps = Math.abs(targetIndex - draggedIndex)
            const ids = [draggedId]
            editor.markHistoryStoppingPoint('reorder layers')
            for (let step = 0; step < steps; step += 1) {
              if (draggedIndex < targetIndex) editor.sendBackward(ids)
              else editor.bringForward(ids)
            }
            editor.focus()
          }}
        >
          <GripVertical className="size-4 shrink-0 text-muted-foreground" />
          <Button
            aria-label={`选择图层 ${layer.name}`}
            className="h-auto min-w-0 flex-1 justify-start gap-3 rounded-lg px-2 py-2 text-left font-normal"
            onClick={(event) => {
              editor.setCurrentTool('select')
              if (event.shiftKey)
                editor.setSelectedShapes([
                  ...editor.getSelectedShapeIds(),
                  layer.id,
                ])
              else editor.select(layer.id)
              editor.zoomToSelection({ animation: { duration: 180 } })
              editor.focus()
            }}
            variant="ghost"
          >
            <HugeiconsIcon
              className="text-muted-foreground"
              icon={getLayerIcon(layer.type)}
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm">{layer.name}</span>
              <span className="text-xs text-muted-foreground">
                {getLayerType(layer.type)}
              </span>
            </span>
          </Button>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  aria-label={layer.visible ? '隐藏图层' : '显示图层'}
                  onClick={() => {
                    const shape = editor.getShape(layer.id)
                    if (!shape) return
                    editor.updateShape({
                      id: layer.id,
                      type: shape.type,
                      meta: {
                        ...shape.meta,
                        visibility: layer.visible ? 'hidden' : 'inherit',
                      },
                    })
                    editor.focus()
                  }}
                  size="icon-sm"
                  variant="ghost"
                />
              }
            >
              {layer.visible ? <Eye /> : <EyeOff />}
            </TooltipTrigger>
            <TooltipContent>
              {layer.visible ? '隐藏图层' : '显示图层'}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  aria-label={layer.locked ? '解锁图层' : '锁定图层'}
                  onClick={() => {
                    editor.toggleLock([layer.id])
                    editor.focus()
                  }}
                  size="icon-sm"
                  variant="ghost"
                />
              }
            >
              {layer.locked ? <Lock /> : <Unlock />}
            </TooltipTrigger>
            <TooltipContent>
              {layer.locked ? '解锁图层' : '锁定图层'}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  aria-label="重命名图层"
                  onClick={() => {
                    const shape = editor.getShape(layer.id)
                    if (!shape) return
                    const name = window.prompt('重命名图层', layer.name)?.trim()
                    if (!name || name === layer.name) return
                    editor.updateShape({
                      id: shape.id,
                      type: shape.type,
                      meta: { ...shape.meta, name },
                    })
                    editor.focus()
                  }}
                  size="icon-sm"
                  variant="ghost"
                />
              }
            >
              <Pencil />
            </TooltipTrigger>
            <TooltipContent>重命名图层</TooltipContent>
          </Tooltip>
        </div>
      ))}
    </div>
  )
}

function LayerCount({ editor }: { editor: Editor }) {
  const count = useValue(
    'image editor layer count',
    () =>
      editor
        .getCurrentPageShapes()
        .filter((shape) => !isDecompositionGroup(shape)).length,
    [editor],
  )

  return (
    <p className="mt-1 text-xs text-muted-foreground">{count} 个画布元素</p>
  )
}

function LayerDecompositionAction({ editor }: { editor: Editor }) {
  const { isPending, openForShape } = useLayerDecompositionContext()
  const selectedImageId = useValue(
    'image editor selected image for decomposition',
    () => {
      const selectedIds = editor.getSelectedShapeIds()
      if (selectedIds.length !== 1) return null
      const shape = editor.getShape(selectedIds[0])
      return shape?.type === 'image' ? shape.id : null
    },
    [editor],
  )

  return (
    <Button
      className="w-full rounded-xl"
      disabled={!selectedImageId || isPending}
      onClick={() => {
        if (selectedImageId) openForShape(selectedImageId)
      }}
      size="sm"
    >
      <HugeiconsIcon data-icon="inline-start" icon={UngroupLayersIcon} />
      {isPending ? '正在分离' : '分离当前图层'}
    </Button>
  )
}

export function ImageEditorLayers({
  editor,
  onAddImages,
}: ImageEditorLayersProps) {
  return (
    <aside className="absolute top-80 right-4 bottom-4 z-20 hidden w-72 min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card/95 shadow-xl shadow-foreground/5 backdrop-blur-xl xl:flex">
      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <HugeiconsIcon icon={Layers01Icon} />
            图层
          </div>
          {editor ? (
            <LayerCount editor={editor} />
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">画布加载中</p>
          )}
        </div>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                aria-label="添加图片"
                className="rounded-full"
                disabled={!editor}
                onClick={onAddImages}
                size="icon-sm"
                variant="ghost"
              />
            }
          >
            <HugeiconsIcon icon={ImageAdd01Icon} />
          </TooltipTrigger>
          <TooltipContent>添加图片</TooltipContent>
        </Tooltip>
      </div>

      {editor ? (
        <ConnectedLayers editor={editor} />
      ) : (
        <div className="px-4 py-6 text-sm text-muted-foreground">
          正在准备图层…
        </div>
      )}

      <div className="mt-auto border-t border-border bg-primary/10 p-4">
        <p className="text-sm font-medium">AI 助手</p>
        <div className="mt-3">
          {editor ? (
            <LayerDecompositionAction editor={editor} />
          ) : (
            <Button className="w-full rounded-xl" disabled size="sm">
              分离当前图层
            </Button>
          )}
        </div>
      </div>
    </aside>
  )
}
