import {
  FitToScreenIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { type Editor, useValue } from 'tldraw'

import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export function ImageEditorZoomControls({ editor }: { editor: Editor | null }) {
  const zoom = useValue(
    'image editor zoom level',
    () => Math.round((editor?.getZoomLevel() ?? 1) * 100),
    [editor],
  )

  const focusEditor = () => editor?.focus()

  return (
    <div className="pointer-events-none absolute bottom-4 left-4 z-20 hidden sm:block">
      <div className="pointer-events-auto flex h-10 items-center gap-0.5 rounded-xl border border-border bg-card/95 p-1 shadow-xl shadow-foreground/5 backdrop-blur-xl">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                aria-label="缩小"
                disabled={!editor}
                onClick={() => {
                  editor?.zoomOut(undefined, { animation: { duration: 120 } })
                  focusEditor()
                }}
                size="icon-sm"
                variant="ghost"
              />
            }
          >
            <HugeiconsIcon icon={ZoomOutIcon} />
          </TooltipTrigger>
          <TooltipContent side="top">缩小</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                aria-label={`当前缩放 ${zoom}%，点击恢复 100%`}
                className="w-14 rounded-lg px-1 text-xs tabular-nums"
                disabled={!editor}
                onClick={() => {
                  editor?.resetZoom(undefined, {
                    animation: { duration: 180 },
                  })
                  focusEditor()
                }}
                size="sm"
                variant="ghost"
              />
            }
          >
            {zoom}%
          </TooltipTrigger>
          <TooltipContent side="top">恢复 100%</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                aria-label="放大"
                disabled={!editor}
                onClick={() => {
                  editor?.zoomIn(undefined, { animation: { duration: 120 } })
                  focusEditor()
                }}
                size="icon-sm"
                variant="ghost"
              />
            }
          >
            <HugeiconsIcon icon={ZoomInIcon} />
          </TooltipTrigger>
          <TooltipContent side="top">放大</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                aria-label="适应内容"
                disabled={!editor}
                onClick={() => {
                  editor?.zoomToFit({ animation: { duration: 220 } })
                  focusEditor()
                }}
                size="icon-sm"
                variant="ghost"
              />
            }
          >
            <HugeiconsIcon icon={FitToScreenIcon} />
          </TooltipTrigger>
          <TooltipContent side="top">适应内容</TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}
