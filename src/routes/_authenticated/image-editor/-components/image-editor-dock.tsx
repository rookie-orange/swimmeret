import {
  ArrowUpRight03Icon,
  Cursor01Icon,
  EraserIcon,
  FrameIcon,
  HandIcon,
  HighlighterIcon,
  ImageAdd01Icon,
  LineIcon,
  MoreHorizontalIcon,
  NoteIcon,
  PencilEdit01Icon,
  ShapesIcon,
  TextIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { type Editor, useValue } from 'tldraw'

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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

const primaryTools = [
  { id: 'select', label: '选择', icon: Cursor01Icon },
  { id: 'hand', label: '抓手', icon: HandIcon },
  { id: 'draw', label: '画笔', icon: PencilEdit01Icon },
  { id: 'arrow', label: '箭头', icon: ArrowUpRight03Icon },
  { id: 'text', label: '文字', icon: TextIcon },
  { id: 'geo', label: '形状', icon: ShapesIcon },
] as const

const secondaryTools = [
  { id: 'eraser', label: '橡皮擦', icon: EraserIcon },
  { id: 'note', label: '便签', icon: NoteIcon },
  { id: 'line', label: '直线', icon: LineIcon },
  { id: 'highlight', label: '高亮笔', icon: HighlighterIcon },
  { id: 'frame', label: '画框', icon: FrameIcon },
] as const

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
  const activeTool = useValue(
    'image editor active tool',
    () => editor?.getCurrentToolId() ?? 'select',
    [editor],
  )
  const isSecondaryToolActive = secondaryTools.some(
    (tool) => tool.id === activeTool,
  )

  const activateTool = (toolId: string) => {
    editor?.setCurrentTool(toolId)
    editor?.focus()
  }

  return (
    <div className="pointer-events-none absolute right-2 bottom-2 left-2 z-20 flex min-w-0 justify-center sm:right-4 sm:bottom-4 sm:left-4 xl:right-80">
      <div className="pointer-events-auto w-fit max-w-full rounded-2xl border border-border bg-card/95 shadow-2xl shadow-foreground/10 backdrop-blur-xl">
        <div className="flex min-w-0 items-center gap-0.5 overflow-x-auto p-1 scrollbar-none [&::-webkit-scrollbar]:hidden">
          {primaryTools.map((tool) => (
            <Tooltip key={tool.id}>
              <TooltipTrigger
                render={
                  <Button
                    aria-label={tool.label}
                    aria-pressed={activeTool === tool.id}
                    disabled={!editor}
                    onClick={() => activateTool(tool.id)}
                    size="icon-lg"
                    variant={activeTool === tool.id ? 'default' : 'ghost'}
                  />
                }
              >
                <HugeiconsIcon icon={tool.icon} />
              </TooltipTrigger>
              <TooltipContent>{tool.label}</TooltipContent>
            </Tooltip>
          ))}
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
          <DropdownMenu>
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
                  onValueChange={activateTool}
                  value={activeTool}
                >
                  {secondaryTools.map((tool) => (
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
      </div>
    </div>
  )
}
