import { ImageAdd01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { type Editor } from 'tldraw'

import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

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
  return (
    <div className="pointer-events-none absolute right-2 bottom-2 left-2 z-20 flex min-w-0 justify-center sm:right-4 sm:bottom-4 sm:left-4 xl:right-80">
      <div className="pointer-events-auto w-fit max-w-full rounded-3xl border border-border bg-card/95 shadow-2xl shadow-foreground/10 backdrop-blur-xl">
        <div className="flex min-w-0 items-center gap-0.5 overflow-x-auto p-1 scrollbar-none [&::-webkit-scrollbar]:hidden">
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
        </div>
      </div>
    </div>
  )
}
