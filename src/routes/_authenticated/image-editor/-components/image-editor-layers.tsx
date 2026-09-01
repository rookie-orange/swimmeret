import { useMemo } from 'react'
import {
  ImageAdd01Icon,
  Layers01Icon,
  PencilEdit01Icon,
  ShapesIcon,
  TextIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { computed, type Editor, type TLShapeId, useValue } from 'tldraw'

import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface ImageEditorLayersProps {
  editor: Editor | null
  onAddImages: () => void
}

interface LayerItem {
  id: TLShapeId
  name: string
  type: string
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

function areLayersEqual(previous: LayerItem[], next: LayerItem[]) {
  return (
    previous.length === next.length &&
    previous.every(
      (layer, index) =>
        layer.id === next[index]?.id &&
        layer.name === next[index]?.name &&
        layer.type === next[index]?.type,
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
            const type = getLayerType(shape.type)
            let name = type

            if (shape.type === 'image' && shape.props.assetId) {
              const asset = editor.getAsset(shape.props.assetId)
              name = asset?.type === 'image' ? asset.props.name || type : type
            } else {
              const text = editor.getShapeUtil(shape).getText(shape)?.trim()
              if (text) name = text
            }

            layers.push({ id: shape.id, name, type: shape.type })
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
        <Button
          aria-label={`选择图层 ${layer.name}`}
          className={cn(
            'h-auto w-full justify-start gap-3 rounded-xl px-3 py-2 text-left font-normal',
            selectedShapeId === layer.id && 'bg-secondary text-foreground',
          )}
          key={layer.id}
          onClick={() => {
            editor.setCurrentTool('select')
            editor.select(layer.id)
            editor.zoomToSelection({ animation: { duration: 180 } })
            editor.focus()
          }}
          variant="ghost"
        >
          <HugeiconsIcon
            className="text-muted-foreground"
            icon={getLayerIcon(layer.type)}
            strokeWidth={1.8}
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm">{layer.name}</span>
            <span className="text-xs text-muted-foreground">
              {getLayerType(layer.type)}
            </span>
          </span>
        </Button>
      ))}
    </div>
  )
}

function LayerCount({ editor }: { editor: Editor }) {
  const count = useValue(
    'image editor layer count',
    () => editor.getCurrentPageShapeIds().size,
    [editor],
  )

  return (
    <p className="mt-1 text-xs text-muted-foreground">{count} 个画布元素</p>
  )
}

export function ImageEditorLayers({
  editor,
  onAddImages,
}: ImageEditorLayersProps) {
  return (
    <aside className="absolute top-4 right-4 bottom-4 z-20 hidden w-72 min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card/95 shadow-xl shadow-foreground/5 backdrop-blur-xl xl:flex">
      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <HugeiconsIcon icon={Layers01Icon} strokeWidth={1.8} />
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
            <HugeiconsIcon icon={ImageAdd01Icon} strokeWidth={1.8} />
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
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          智能抠图与扩图将在后续版本开放。
        </p>
        <Button className="mt-3 w-full rounded-xl" disabled size="sm">
          分离当前图层
        </Button>
      </div>
    </aside>
  )
}
