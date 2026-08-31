import { useState } from 'react'
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

import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

const imageTools = [
  { label: '选择', icon: CursorPointer01Icon },
  { label: '抓手', icon: HandIcon },
  { label: '钢笔', icon: PencilEdit01Icon },
  { label: '文字', icon: TextIcon },
  { label: '形状', icon: ShapesIcon },
  { label: '素材', icon: ImageAdd01Icon },
  { label: 'AI 助手', icon: AiSparklesIcon },
] as const

export function ImageEditorDock() {
  const [activeTool, setActiveTool] = useState('选择')

  return (
    <div className="col-start-1 row-start-3 flex min-w-0 justify-center">
      <div className="w-full max-w-xl rounded-[28px] border border-border bg-card/95 p-1.5 shadow-2xl shadow-foreground/10 backdrop-blur-xl">
        <div className="flex h-11 min-w-0 items-center gap-0.5 overflow-x-auto px-1 scrollbar-none [&::-webkit-scrollbar]:hidden">
          {imageTools.map((tool) => (
            <Tooltip key={tool.label}>
              <TooltipTrigger
                render={
                  <Button
                    aria-label={tool.label}
                    aria-pressed={activeTool === tool.label}
                    className={cn(
                      'size-10 shrink-0 rounded-full text-muted-foreground transition-all duration-200 motion-reduce:transition-none',
                      tool.label === 'AI 助手' &&
                        'text-primary hover:text-primary',
                    )}
                    onClick={() => setActiveTool(tool.label)}
                    size="icon"
                    variant={activeTool === tool.label ? 'secondary' : 'ghost'}
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
                  aria-label="更多工具"
                  className="size-10 shrink-0 rounded-full text-muted-foreground"
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
