import {
  AiSparklesIcon,
  HandIcon,
  ImageAdd01Icon,
  MoreHorizontalIcon,
  PencilEdit01Icon,
  ShapesIcon,
  TextIcon,
  Cursor01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { type Editor, useValue } from 'tldraw'

import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

const imageTools = [
  { id: 'select', label: '选择', icon: Cursor01Icon },
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
      <div className="pointer-events-auto w-fit max-w-full rounded-3xl border border-border bg-card/95 shadow-2xl shadow-foreground/10 backdrop-blur-xl">
        <div className="flex min-w-0 items-center gap-0.5 overflow-x-auto p-1 scrollbar-none [&::-webkit-scrollbar]:hidden">
          {imageTools.map((tool) => (
            <Tooltip key={tool.id}>
              <TooltipTrigger
                render={
                  <Button
                    aria-label={tool.label}
                    aria-pressed={activeTool === tool.id}
                    disabled={!editor}
                    onClick={() => {
                      editor?.setCurrentTool(tool.id)
                      editor?.focus()
                    }}
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
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  aria-label="AI 助手"
                  disabled
                  size="icon-lg"
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
                  disabled
                  size="icon-lg"
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
