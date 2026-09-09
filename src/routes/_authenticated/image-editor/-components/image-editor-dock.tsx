import { useCallback, useState } from 'react'
import {
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowUp01Icon,
  ArrowUpRight03Icon,
  CloudIcon,
  Cursor01Icon,
  DiamondIcon,
  EllipseIcon,
  EraserIcon,
  FrameIcon,
  HandIcon,
  HeartIcon,
  HexagonIcon,
  HighlighterIcon,
  ImageAdd01Icon,
  LineIcon,
  LockIcon,
  LockOpenIcon,
  MoreHorizontalIcon,
  NoteIcon,
  OctagonIcon,
  ParallelogramIcon,
  PentagonIcon,
  PencilEdit01Icon,
  SquareCheckIcon,
  SquareIcon,
  SquareXIcon,
  StarIcon,
  TextIcon,
  TrapezoidLineHorizontalIcon,
  TriangleIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react'
import { GeoShapeGeoStyle, type Editor, useValue } from 'tldraw'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface ToolDefinition {
  id: string
  label: string
  icon: IconSvgElement
  shortcut?: string
}

const primaryTools = [
  { id: 'select', label: '选择', icon: Cursor01Icon, shortcut: 'V' },
  { id: 'hand', label: '抓手', icon: HandIcon, shortcut: 'H' },
  { id: 'draw', label: '画笔', icon: PencilEdit01Icon, shortcut: 'D' },
  { id: 'eraser', label: '橡皮擦', icon: EraserIcon, shortcut: 'E' },
  { id: 'arrow', label: '箭头', icon: ArrowUpRight03Icon, shortcut: 'A' },
  { id: 'text', label: '文字', icon: TextIcon, shortcut: 'T' },
  { id: 'note', label: '便签', icon: NoteIcon, shortcut: 'N' },
] as const satisfies readonly ToolDefinition[]

const secondaryTools = [
  { id: 'line', label: '直线', icon: LineIcon, shortcut: 'L' },
  { id: 'highlight', label: '高亮笔', icon: HighlighterIcon },
  { id: 'frame', label: '画框', icon: FrameIcon, shortcut: 'F' },
] as const satisfies readonly ToolDefinition[]

const geoTools = [
  { id: 'rectangle', label: '矩形', icon: SquareIcon, shortcut: 'R' },
  { id: 'ellipse', label: '椭圆', icon: EllipseIcon, shortcut: 'O' },
  { id: 'triangle', label: '三角形', icon: TriangleIcon },
  { id: 'diamond', label: '菱形', icon: DiamondIcon },
  { id: 'star', label: '星形', icon: StarIcon },
  { id: 'pentagon', label: '五边形', icon: PentagonIcon },
  { id: 'hexagon', label: '六边形', icon: HexagonIcon },
  { id: 'octagon', label: '八边形', icon: OctagonIcon },
  { id: 'rhombus', label: '平行四边形', icon: ParallelogramIcon },
  { id: 'rhombus-2', label: '反向平行四边形', icon: ParallelogramIcon },
  { id: 'oval', label: '胶囊形', icon: EllipseIcon },
  {
    id: 'trapezoid',
    label: '梯形',
    icon: TrapezoidLineHorizontalIcon,
  },
  { id: 'arrow-left', label: '左箭头', icon: ArrowLeft01Icon },
  { id: 'arrow-up', label: '上箭头', icon: ArrowUp01Icon },
  { id: 'arrow-down', label: '下箭头', icon: ArrowDown01Icon },
  { id: 'arrow-right', label: '右箭头', icon: ArrowRight01Icon },
  { id: 'cloud', label: '云朵', icon: CloudIcon },
  { id: 'x-box', label: '交叉框', icon: SquareXIcon },
  { id: 'check-box', label: '勾选框', icon: SquareCheckIcon },
  { id: 'heart', label: '心形', icon: HeartIcon },
] as const satisfies readonly ToolDefinition[]

function getToolLabel(tool: ToolDefinition) {
  return tool.shortcut ? `${tool.label} (${tool.shortcut})` : tool.label
}

function DockToolButton({
  activeToolId,
  disabled,
  onActivate,
  tool,
}: {
  activeToolId: string
  disabled: boolean
  onActivate: (toolId: string) => void
  tool: ToolDefinition
}) {
  const isActive = activeToolId === tool.id

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            aria-label={getToolLabel(tool)}
            aria-pressed={isActive}
            disabled={disabled}
            onClick={() => onActivate(tool.id)}
            size="icon-lg"
            variant={isActive ? 'default' : 'ghost'}
          />
        }
      >
        <HugeiconsIcon icon={tool.icon} />
      </TooltipTrigger>
      <TooltipContent>{getToolLabel(tool)}</TooltipContent>
    </Tooltip>
  )
}

function ShapeToolPicker({
  activeToolId,
  activeGeo,
  disabled,
  onActivate,
}: {
  activeToolId: string
  activeGeo: (typeof geoTools)[number]
  disabled: boolean
  onActivate: (toolId: string) => void
}) {
  const isActive = activeToolId === 'geo'
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="flex shrink-0 items-center">
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              aria-label={`形状：${getToolLabel(activeGeo)}`}
              aria-pressed={isActive}
              className="rounded-r-lg"
              disabled={disabled}
              onClick={() => onActivate(activeGeo.id)}
              size="icon-lg"
              variant={isActive ? 'default' : 'ghost'}
            />
          }
        >
          <HugeiconsIcon icon={activeGeo.icon} />
        </TooltipTrigger>
        <TooltipContent>形状：{getToolLabel(activeGeo)}</TooltipContent>
      </Tooltip>
      <DropdownMenu onOpenChange={setIsOpen} open={isOpen}>
        <DropdownMenuTrigger
          render={
            <Button
              aria-label="选择形状"
              className="w-5 rounded-l-lg px-0"
              disabled={disabled}
              size="icon-lg"
              variant={isActive ? 'default' : 'ghost'}
            />
          }
        >
          <HugeiconsIcon icon={ArrowUp01Icon} />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="center"
          className="w-72"
          side="top"
          sideOffset={8}
        >
          <DropdownMenuGroup>
            <DropdownMenuLabel>选择形状</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              className="grid grid-cols-2 gap-0.5"
              onValueChange={(toolId) => {
                setIsOpen(false)
                onActivate(toolId)
              }}
              value={activeGeo.id}
            >
              {geoTools.map((tool) => (
                <DropdownMenuRadioItem key={tool.id} value={tool.id}>
                  <HugeiconsIcon icon={tool.icon} />
                  {tool.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

interface ImageEditorDockProps {
  editor: Editor | null
  isImporting: boolean
  onAddImages: () => void
}

export function ImageEditorDock({
  editor,
  isImporting,
  onAddImages,
}: ImageEditorDockProps) {
  const [isMoreOpen, setIsMoreOpen] = useState(false)
  const activeToolId = useValue(
    'image editor active tool',
    () => editor?.getCurrentToolId() ?? 'select',
    [editor],
  )
  const isToolLockable = useValue(
    'image editor active tool is lockable',
    () => editor?.getCurrentTool().isLockable ?? false,
    [editor],
  )
  const isToolLocked = useValue(
    'image editor tool lock',
    () => editor?.getInstanceState().isToolLocked ?? false,
    [editor],
  )
  const activeGeoId = useValue(
    'image editor active geo tool',
    () => editor?.getStyleForNextShape(GeoShapeGeoStyle) ?? 'rectangle',
    [editor],
  )
  const activeGeo =
    geoTools.find((tool) => tool.id === activeGeoId) ?? geoTools[0]
  const isSecondaryToolActive = secondaryTools.some(
    (tool) => tool.id === activeToolId,
  )

  const focusEditor = useCallback(() => {
    if (editor) requestAnimationFrame(() => editor.focus())
  }, [editor])
  const activateTool = useCallback(
    (toolId: string) => {
      if (!editor) return

      const geoTool = geoTools.find((tool) => tool.id === toolId)
      editor.run(() => {
        if (geoTool) {
          editor.setStyleForNextShapes(GeoShapeGeoStyle, geoTool.id)
          editor.setCurrentTool('geo')
          return
        }

        if (toolId === 'select' && editor.isIn('select')) {
          const currentNode = editor.root.getCurrent()
          if (currentNode) {
            currentNode.exit({}, currentNode.id)
            currentNode.enter({}, currentNode.id)
          }
        }
        editor.setCurrentTool(toolId)
      })
      focusEditor()
    },
    [editor, focusEditor],
  )

  return (
    <div className="pointer-events-none absolute right-2 bottom-2 left-2 z-20 flex min-w-0 justify-center sm:right-4 sm:bottom-4 sm:left-4 xl:right-80">
      <div
        className="pointer-events-auto w-fit max-w-full rounded-2xl border border-border bg-card/95 shadow-2xl shadow-foreground/10 backdrop-blur-xl"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div
          aria-label="画布工具"
          className="flex min-w-0 items-center gap-0.5 overflow-x-auto p-1 scrollbar-none [&::-webkit-scrollbar]:hidden"
          role="toolbar"
        >
          {primaryTools.map((tool) => (
            <DockToolButton
              activeToolId={activeToolId}
              disabled={!editor}
              key={tool.id}
              onActivate={activateTool}
              tool={tool}
            />
          ))}
          <ShapeToolPicker
            activeGeo={activeGeo}
            activeToolId={activeToolId}
            disabled={!editor}
            onActivate={activateTool}
          />
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  aria-label="素材"
                  disabled={!editor || isImporting}
                  onClick={onAddImages}
                  size="icon-lg"
                  variant="ghost"
                />
              }
            >
              <HugeiconsIcon icon={ImageAdd01Icon} />
            </TooltipTrigger>
            <TooltipContent>{isImporting ? '正在导入' : '素材'}</TooltipContent>
          </Tooltip>
          <DropdownMenu onOpenChange={setIsMoreOpen} open={isMoreOpen}>
            <DropdownMenuTrigger
              render={
                <Button
                  aria-label="更多工具"
                  aria-pressed={isSecondaryToolActive}
                  disabled={!editor}
                  size="icon-lg"
                  variant={isSecondaryToolActive ? 'secondary' : 'ghost'}
                />
              }
            >
              <HugeiconsIcon icon={MoreHorizontalIcon} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" sideOffset={8}>
              <DropdownMenuGroup>
                <DropdownMenuLabel>更多工具</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  onValueChange={(toolId) => {
                    setIsMoreOpen(false)
                    activateTool(toolId)
                  }}
                  value={activeToolId}
                >
                  {secondaryTools.map((tool) => (
                    <DropdownMenuRadioItem key={tool.id} value={tool.id}>
                      <HugeiconsIcon icon={tool.icon} />
                      {getToolLabel(tool)}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <Separator className="mx-1 h-6 !self-center" orientation="vertical" />
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  aria-label={
                    isToolLocked ? '关闭连续使用工具 (Q)' : '连续使用工具 (Q)'
                  }
                  aria-pressed={isToolLockable && isToolLocked}
                  disabled={!editor || !isToolLockable}
                  onClick={() => {
                    editor?.updateInstanceState({
                      isToolLocked: !isToolLocked,
                    })
                    focusEditor()
                  }}
                  size="icon-lg"
                  variant={
                    isToolLockable && isToolLocked ? 'secondary' : 'ghost'
                  }
                />
              }
            >
              <HugeiconsIcon
                icon={isToolLockable && isToolLocked ? LockIcon : LockOpenIcon}
              />
            </TooltipTrigger>
            <TooltipContent>
              {isToolLocked ? '关闭连续使用工具 (Q)' : '连续使用工具 (Q)'}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  )
}
