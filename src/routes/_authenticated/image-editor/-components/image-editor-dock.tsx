import { useCallback, useRef, useState } from 'react'
import {
  Add01Icon,
  AiImageIcon,
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowUp01Icon,
  ArrowUpRight03Icon,
  CloudIcon,
  MousePointer01Icon,
  DiamondIcon,
  EllipseIcon,
  EraserIcon,
  FrameIcon,
  HandIcon,
  HeartIcon,
  HexagonIcon,
  HighlighterIcon,
  ImageAdd01Icon,
  LinerIcon,
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
import {
  DefaultColorStyle,
  GeoShapeGeoStyle,
  type Editor,
  useValue,
} from 'tldraw'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

import { editorCapsuleClassName } from './editor-capsule'

interface ToolDefinition {
  id: string
  label: string
  icon: IconSvgElement
  shortcut?: string
}

const primaryTools = [
  { id: 'select', label: '选择', icon: MousePointer01Icon, shortcut: 'V' },
  { id: 'hand', label: '抓手', icon: HandIcon, shortcut: 'H' },
  { id: 'draw', label: '画笔', icon: PencilEdit01Icon, shortcut: 'D' },
  { id: 'eraser', label: '橡皮擦', icon: EraserIcon, shortcut: 'E' },
  { id: 'text', label: '文字', icon: TextIcon, shortcut: 'T' },
  { id: 'note', label: '便签', icon: NoteIcon, shortcut: 'N' },
] as const satisfies readonly ToolDefinition[]

const arrowTool = {
  id: 'arrow',
  label: '箭头',
  icon: ArrowUpRight03Icon,
  shortcut: 'A',
} as const

const secondaryTools = [
  { id: 'line', label: '直线', icon: LinerIcon, shortcut: 'L' },
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

const quickGeoTools = [
  geoTools[0],
  { ...geoTools[1], label: '圆形' },
  geoTools[2],
  secondaryTools[0],
  arrowTool,
  { ...arrowTool, id: 'arrow-elbow', label: '折线箭头' },
] as const satisfies readonly ToolDefinition[]

const drawQuickTools = [primaryTools[2], secondaryTools[1]] as const

const dockColors = [
  ['black', '!bg-canvas-swatch-black'],
  ['blue', '!bg-canvas-swatch-blue'],
  ['red', '!bg-canvas-swatch-red'],
  ['yellow', '!bg-canvas-swatch-yellow'],
  ['green', '!bg-canvas-swatch-green'],
  ['light-blue', '!bg-canvas-swatch-light-blue'],
  ['violet', '!bg-canvas-swatch-violet'],
  ['white', '!bg-canvas-swatch-white'],
] as const

function HoverToolPicker({
  tool,
  options,
  activeToolId,
  disabled,
  onActivate,
}: {
  tool: ToolDefinition
  options: readonly ToolDefinition[]
  activeToolId: string
  disabled: boolean
  onActivate: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const timer = useRef<number | null>(null)
  const enter = () => {
    if (timer.current) window.clearTimeout(timer.current)
    setOpen(true)
  }
  const leave = () => {
    timer.current = window.setTimeout(() => setOpen(false), 180)
  }
  const active = activeToolId === tool.id
  return (
    <Popover open={open && !disabled} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            aria-label={getToolLabel(tool)}
            aria-pressed={active}
            disabled={disabled}
            size="icon-lg"
            variant={active ? 'default' : 'ghost'}
            onMouseEnter={enter}
            onMouseLeave={leave}
            onClick={() => onActivate(tool.id)}
          />
        }
      >
        <HugeiconsIcon icon={tool.icon} />
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-2"
        side="top"
        sideOffset={4}
        onMouseEnter={enter}
        onMouseLeave={leave}
      >
        <div className="flex gap-1">
          {options.map((item) => (
            <Button
              key={item.id}
              aria-label={item.label}
              size="icon"
              variant={activeToolId === item.id ? 'secondary' : 'ghost'}
              onClick={() => {
                setOpen(false)
                onActivate(item.id)
              }}
            >
              <HugeiconsIcon icon={item.icon} />
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function NoteToolPicker({
  activeToolId,
  disabled,
  onActivate,
  onColor,
  activeColor,
}: {
  activeToolId: string
  disabled: boolean
  onActivate: (id: string) => void
  onColor: (color: string) => void
  activeColor: string
}) {
  const [open, setOpen] = useState(false)
  const timer = useRef<number | null>(null)
  const active = activeToolId === 'note'
  return (
    <Popover open={open && !disabled} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            aria-label="便签"
            aria-pressed={active}
            disabled={disabled}
            size="icon-lg"
            variant={active ? 'default' : 'ghost'}
            onMouseEnter={() => {
              if (timer.current) window.clearTimeout(timer.current)
              setOpen(true)
            }}
            onMouseLeave={() => {
              timer.current = window.setTimeout(() => setOpen(false), 180)
            }}
            onClick={() => onActivate('note')}
          />
        }
      >
        <HugeiconsIcon icon={NoteIcon} />
      </PopoverTrigger>
      <PopoverContent
        align="center"
        className="w-auto p-2"
        side="top"
        sideOffset={4}
        onMouseEnter={() => {
          if (timer.current) window.clearTimeout(timer.current)
          setOpen(true)
        }}
        onMouseLeave={() => {
          timer.current = window.setTimeout(() => setOpen(false), 180)
        }}
      >
        <div className="grid grid-cols-8 gap-1">
          {dockColors.map(([color, colorClass]) => (
            <Button
              key={color}
              aria-label={`便签颜色 ${color}`}
              type="button"
              size="icon"
              variant="ghost"
              className={cn(
                'size-7 rounded-md border border-border p-0 !text-transparent hover:!brightness-100 focus:!brightness-100',
                colorClass,
                activeColor === color && 'ring-2 ring-ring ring-offset-1',
              )}
              onClick={() => {
                setOpen(false)
                onColor(color)
                onActivate('note')
              }}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

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
  activeGeo: ToolDefinition
  disabled: boolean
  onActivate: (toolId: string) => void
}) {
  const [open, setOpen] = useState(false)
  const timer = useRef<number | null>(null)
  const enter = () => {
    if (timer.current) window.clearTimeout(timer.current)
    setOpen(true)
  }
  const leave = () => {
    timer.current = window.setTimeout(() => setOpen(false), 180)
  }
  return (
    <Popover open={open && !disabled} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            aria-label={`形状：${getToolLabel(activeGeo)}`}
            aria-pressed={activeToolId === 'geo'}
            disabled={disabled}
            size="icon-lg"
            variant={activeToolId === 'geo' ? 'default' : 'ghost'}
            onMouseEnter={enter}
            onMouseLeave={leave}
            onClick={() => onActivate(activeGeo.id)}
          />
        }
      >
        <HugeiconsIcon icon={activeGeo.icon} />
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-2"
        side="top"
        sideOffset={4}
        onMouseEnter={enter}
        onMouseLeave={leave}
      >
        <div className="grid grid-cols-6 gap-1">
          {quickGeoTools.map((tool) => (
            <Button
              key={tool.id}
              aria-label={tool.label}
              size="icon"
              variant={activeGeo.id === tool.id ? 'secondary' : 'ghost'}
              onClick={() => {
                setOpen(false)
                onActivate(tool.id)
              }}
            >
              <HugeiconsIcon icon={tool.icon} />
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

interface ImageEditorDockProps {
  editor: Editor | null
  isImporting: boolean
  onAddImages: () => void
  onAddGeneration: () => void
}

export function ImageEditorDock({
  editor,
  isImporting,
  onAddImages,
  onAddGeneration,
}: ImageEditorDockProps) {
  const isReadonly = useValue(
    'dock readonly',
    () => editor?.getIsReadonly() ?? true,
    [editor],
  )
  const activeToolId = useValue(
    'image editor active tool',
    () => editor?.getCurrentToolId() ?? 'select',
    [editor],
  )
  const activeGeoId = useValue(
    'image editor active geo tool',
    () => editor?.getStyleForNextShape(GeoShapeGeoStyle) ?? 'rectangle',
    [editor],
  )
  const activeColor = useValue(
    'image editor active color',
    () => editor?.getStyleForNextShape(DefaultColorStyle) ?? 'black',
    [editor],
  )
  const activeGeo =
    quickGeoTools.find((tool) => tool.id === activeGeoId) ??
    geoTools.find((tool) => tool.id === activeGeoId) ??
    geoTools[0]

  const focusEditor = useCallback(() => {
    if (editor) requestAnimationFrame(() => editor.focus())
  }, [editor])
  const activateTool = useCallback(
    (toolId: string) => {
      if (!editor) return

      if (toolId === 'arrow-elbow') toolId = 'arrow'

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
  const activateNoteColor = useCallback(
    (color: string) => {
      if (!editor) return
      editor.run(() => editor.setStyleForNextShapes(DefaultColorStyle, color))
    },
    [editor],
  )

  return (
    <div className="pointer-events-none absolute right-2 bottom-2 left-2 z-20 flex min-w-0 justify-center sm:right-4 sm:bottom-4 sm:left-60 xl:right-88">
      <div
        className={cn(editorCapsuleClassName, 'relative w-112 max-w-full')}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div
          aria-label="画布工具"
          className="flex min-w-0 items-center justify-between gap-0 overflow-x-auto p-1 scrollbar-none [&::-webkit-scrollbar]:hidden"
          role="toolbar"
        >
          {primaryTools.map((tool) =>
            tool.id === 'draw' ? (
              <HoverToolPicker
                key={tool.id}
                tool={tool}
                options={drawQuickTools}
                activeToolId={activeToolId}
                disabled={!editor}
                onActivate={activateTool}
              />
            ) : tool.id === 'note' ? (
              <NoteToolPicker
                key={tool.id}
                activeToolId={activeToolId}
                disabled={!editor}
                onActivate={activateTool}
                onColor={activateNoteColor}
                activeColor={activeColor}
              />
            ) : (
              <DockToolButton
                key={tool.id}
                activeToolId={activeToolId}
                disabled={!editor}
                onActivate={activateTool}
                tool={tool}
              />
            ),
          )}
          <ShapeToolPicker
            activeGeo={activeGeo}
            activeToolId={activeToolId}
            disabled={!editor}
            onActivate={activateTool}
          />
          <DockToolButton
            activeToolId={activeToolId}
            disabled={!editor}
            onActivate={activateTool}
            tool={secondaryTools[2]}
          />
          <DropdownMenu>
            <DropdownMenuTrigger
              disabled={!editor || isReadonly}
              render={
                <Button aria-label="添加" size="icon-lg" variant="ghost" />
              }
            >
              <HugeiconsIcon icon={Add01Icon} />
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="end" sideOffset={12}>
              <DropdownMenuGroup>
                <DropdownMenuItem disabled={isImporting} onClick={onAddImages}>
                  <HugeiconsIcon icon={ImageAdd01Icon} />
                  添加素材
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onAddGeneration}>
                  <HugeiconsIcon icon={AiImageIcon} />
                  文生图
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}
