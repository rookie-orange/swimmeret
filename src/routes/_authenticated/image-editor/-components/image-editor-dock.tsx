import {
  useCallback,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react'
import {
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowUp01Icon,
  ArrowUp02Icon,
  ArrowUpRight03Icon,
  Cancel01Icon,
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
import {
  AnimatePresence,
  motion,
  useIsPresent,
  useReducedMotion,
} from 'motion/react'
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
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

import { AiToolIcon } from './ai-tool-icon'
import { editorCapsuleClassName } from './editor-capsule'

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

const quickGeoTools = [
  geoTools[0],
  geoTools[2],
  { ...geoTools[1], label: '圆形' },
  geoTools[3],
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
  activeGeo: ToolDefinition
  disabled: boolean
  onActivate: (toolId: string) => void
}) {
  const isActive = activeToolId === 'geo'
  const [isOpen, setIsOpen] = useState(false)

  return (
    <DropdownMenu
      modal={false}
      onOpenChange={setIsOpen}
      open={isOpen && !disabled}
    >
      <DropdownMenuTrigger
        closeDelay={150}
        delay={180}
        openOnHover
        onClick={(event) => {
          // Keep keyboard and touch activation available for the menu.
          if (
            event.detail === 0 ||
            (event.nativeEvent instanceof PointerEvent &&
              event.nativeEvent.pointerType === 'touch')
          )
            return

          event.preventBaseUIHandler()
          setIsOpen(false)
          onActivate(activeGeo.id)
        }}
        render={
          <Button
            aria-label={`形状：${getToolLabel(activeGeo)}`}
            aria-pressed={isActive}
            disabled={disabled}
            size="icon-lg"
            variant={isActive ? 'default' : 'ghost'}
          />
        }
      >
        <HugeiconsIcon icon={activeGeo.icon} />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="center"
        aria-label="快捷形状"
        className="w-56"
        finalFocus={(interactionType) => interactionType === 'keyboard'}
        side="top"
        sideOffset={8}
      >
        <DropdownMenuGroup>
          <DropdownMenuRadioGroup
            className="grid grid-cols-4 gap-0.5"
            value={activeGeo.id}
          >
            {quickGeoTools.map((tool) => (
              <DropdownMenuRadioItem
                className="flex-col gap-2 px-2 py-3 text-xs data-checked:bg-primary data-checked:text-primary-foreground [&>span]:hidden"
                key={tool.id}
                onClick={() => {
                  setIsOpen(false)
                  onActivate(tool.id)
                }}
                value={tool.id}
              >
                <HugeiconsIcon icon={tool.icon} />
                {tool.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function DockPanel({
  children,
  onEntered,
}: {
  children: ReactNode
  onEntered?: () => void
}) {
  const isPresent = useIsPresent()
  const reduceMotion = useReducedMotion()

  return (
    <motion.div
      animate="visible"
      aria-hidden={!isPresent}
      className="w-full"
      exit="exit"
      inert={!isPresent}
      initial="enter"
      onAnimationComplete={(definition) => {
        if (definition === 'visible' && isPresent) onEntered?.()
      }}
      transition={
        reduceMotion ? { duration: 0 } : { duration: 0.16, ease: 'easeOut' }
      }
      variants={{
        enter: {
          opacity: 0,
          y: reduceMotion ? 0 : 6,
          scale: reduceMotion ? 1 : 0.98,
        },
        visible: { opacity: 1, y: 0, scale: 1 },
        exit: {
          opacity: 0,
          y: reduceMotion ? 0 : -6,
          scale: reduceMotion ? 1 : 0.98,
        },
      }}
    >
      {children}
    </motion.div>
  )
}

function DockAiInput({
  draft,
  inputRef,
  onDraftChange,
  onClose,
}: {
  draft: string
  inputRef: RefObject<HTMLInputElement | null>
  onDraftChange: (draft: string) => void
  onClose: () => void
}) {
  return (
    <InputGroup
      aria-label="AI 编辑"
      className="h-12 rounded-2xl border-0 bg-transparent"
      onKeyDown={(event) => {
        event.stopPropagation()
        if (event.key === 'Escape' && !event.nativeEvent.isComposing) {
          event.preventDefault()
          onClose()
        }
      }}
      onKeyUp={(event) => event.stopPropagation()}
    >
      <InputGroupInput
        aria-label="AI 编辑指令"
        autoFocus
        onChange={(event) => onDraftChange(event.target.value)}
        placeholder="描述你想对图像做的修改…"
        ref={inputRef}
        value={draft}
      />
      <InputGroupAddon align="inline-start">
        <InputGroupButton
          aria-label="关闭 AI 输入"
          onClick={onClose}
          size="icon-sm"
        >
          <HugeiconsIcon icon={Cancel01Icon} />
        </InputGroupButton>
      </InputGroupAddon>
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          aria-label="发送指令"
          disabled
          size="icon-sm"
          title="AI 编辑即将开放"
          variant="default"
        >
          <HugeiconsIcon icon={ArrowUp02Icon} />
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
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
  const [isAiOpen, setIsAiOpen] = useState(false)
  const [aiDraft, setAiDraft] = useState('')
  const [isAiHovered, setIsAiHovered] = useState(false)
  const [isAiFocused, setIsAiFocused] = useState(false)
  const aiButtonRef = useRef<HTMLButtonElement>(null)
  const aiInputRef = useRef<HTMLInputElement>(null)
  const restoreAiFocus = useRef(false)
  const reduceMotion = useReducedMotion()
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
  const activeGeo =
    quickGeoTools.find((tool) => tool.id === activeGeoId) ??
    geoTools.find((tool) => tool.id === activeGeoId) ??
    geoTools[0]
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
    <div className="pointer-events-none absolute right-2 bottom-2 left-2 z-20 flex min-w-0 justify-center sm:right-4 sm:bottom-4 sm:left-60 xl:right-88">
      <motion.div
        className={cn(
          editorCapsuleClassName,
          'relative w-120 max-w-full',
          isAiOpen && 'w-lg',
        )}
        layout
        onPointerDown={(event) => event.stopPropagation()}
        transition={
          reduceMotion
            ? { duration: 0 }
            : { layout: { type: 'spring', bounce: 0, duration: 0.32 } }
        }
      >
        <AnimatePresence initial={false} mode="wait">
          {isAiOpen ? (
            <DockPanel key="ai-input">
              <DockAiInput
                draft={aiDraft}
                inputRef={aiInputRef}
                onDraftChange={setAiDraft}
                onClose={() => {
                  restoreAiFocus.current = true
                  setIsAiOpen(false)
                }}
              />
            </DockPanel>
          ) : (
            <DockPanel
              key="tools"
              onEntered={() => {
                if (!restoreAiFocus.current) return
                restoreAiFocus.current = false
                aiButtonRef.current?.focus()
              }}
            >
              <div
                aria-label="画布工具"
                className="flex min-w-0 items-center justify-between gap-0.5 overflow-x-auto p-1 scrollbar-none [&::-webkit-scrollbar]:hidden"
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
                  disabled={!editor || isAiOpen}
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
                  <TooltipContent>
                    {isImporting ? '正在导入' : '素材'}
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        aria-label="AI 编辑"
                        disabled={!editor}
                        onBlur={() => setIsAiFocused(false)}
                        onClick={() => {
                          editor?.complete()
                          editor?.blur()
                          setIsMoreOpen(false)
                          setIsAiHovered(false)
                          setIsAiFocused(false)
                          setIsAiOpen(true)
                        }}
                        onFocus={(event) =>
                          setIsAiFocused(
                            event.currentTarget.matches(':focus-visible'),
                          )
                        }
                        onMouseEnter={() => setIsAiHovered(true)}
                        onMouseLeave={() => setIsAiHovered(false)}
                        ref={aiButtonRef}
                        size="icon-lg"
                        variant="ghost"
                      />
                    }
                  >
                    <AiToolIcon
                      active={!isAiOpen && (isAiHovered || isAiFocused)}
                    />
                  </TooltipTrigger>
                  <TooltipContent>AI 编辑</TooltipContent>
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
              </div>
            </DockPanel>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
