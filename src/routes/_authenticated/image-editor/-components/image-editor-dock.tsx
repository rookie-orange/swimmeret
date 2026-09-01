import {
  AiSparklesIcon,
  CursorPointer01Icon,
  HandIcon,
  ImageAdd01Icon,
  MoreHorizontalIcon,
  PencilEdit01Icon,
  ShapesIcon,
  TextIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { type Editor, useValue } from 'tldraw'

import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

const imageTools = [
  { id: 'select', label: '选择', icon: CursorPointer01Icon },
  { id: 'hand', label: '抓手', icon: HandIcon },
  { id: 'draw', label: '钢笔', icon: PencilEdit01Icon },
  { id: 'text', label: '文字', icon: TextIcon },
  { id: 'geo', label: '形状', icon: ShapesIcon },
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

  return (
    <div className="pointer-events-none absolute right-2 bottom-2 left-2 z-20 flex min-w-0 justify-center sm:right-4 sm:bottom-4 sm:left-4 xl:right-80">
      <div className="pointer-events-auto w-fit max-w-full rounded-3xl border border-border bg-card/95 p-1.5 shadow-2xl shadow-foreground/10 backdrop-blur-xl">
        <div className="flex h-11 min-w-0 items-center gap-0.5 overflow-x-auto px-1 scrollbar-none [&::-webkit-scrollbar]:hidden">
          {imageTools.map((tool) => (
            <Tooltip key={tool.id}>
              <TooltipTrigger
                render={
                  <Button
                    aria-label={tool.label}
                    aria-pressed={activeTool === tool.id}
                    className={cn(
                      'size-10 shrink-0 rounded-full text-muted-foreground transition-all duration-200 motion-reduce:transition-none',
                    )}
                    disabled={!editor}
                    onClick={() => {
                      editor?.setCurrentTool(tool.id)
                      editor?.focus()
                    }}
                    size="icon"
                    variant={activeTool === tool.id ? 'secondary' : 'ghost'}
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
                  className="size-10 shrink-0 rounded-full text-muted-foreground"
                  disabled={!editor || isImporting}
                  onClick={onAddImages}
                  size="icon"
                  variant="ghost"
                />
              }
            >
              <HugeiconsIcon icon={ImageAdd01Icon} />
            </TooltipTrigger>
            <TooltipContent>{isImporting ? '正在导入' : '素材'}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  aria-label="AI 助手"
                  className="hidden size-10 shrink-0 rounded-full text-primary sm:inline-flex"
                  disabled
                  size="icon"
                  variant="ghost"
                />
              }
            >
              <HugeiconsIcon icon={AiSparklesIcon} />
            </TooltipTrigger>
            <TooltipContent>AI 助手暂未开放</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  aria-label="更多工具"
                  className="hidden size-10 shrink-0 rounded-full text-muted-foreground sm:inline-flex"
                  disabled
                  size="icon"
                  variant="ghost"
                />
              }
            >
              <HugeiconsIcon icon={MoreHorizontalIcon} />
            </TooltipTrigger>
            <TooltipContent>更多工具</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  )
}
