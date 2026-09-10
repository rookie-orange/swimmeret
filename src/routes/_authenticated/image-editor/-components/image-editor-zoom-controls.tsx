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
import { cn } from '@/lib/utils'

import { editorCapsuleClassName } from './editor-capsule'

export function ImageEditorZoomControls({ editor }: { editor: Editor | null }) {
  const zoom = useValue(
    'image editor zoom level',
    () => Math.round((editor?.getZoomLevel() ?? 1) * 100),
    [editor],
  )

  const focusEditor = () => editor?.focus()

  return (
    <div className="pointer-events-none absolute bottom-4 left-4 z-20 hidden sm:block">
      <div
        className={cn(editorCapsuleClassName, 'flex items-center gap-0.5 p-1')}
      >
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
                size="icon-lg"
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
                className="w-14 px-1 tabular-nums"
                disabled={!editor}
                onClick={() => {
                  editor?.resetZoom(undefined, {
                    animation: { duration: 180 },
                  })
                  focusEditor()
                }}
                size="lg"
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
                size="icon-lg"
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
                size="icon-lg"
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
