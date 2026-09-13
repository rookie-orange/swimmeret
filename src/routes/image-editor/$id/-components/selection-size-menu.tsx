import { PaintBrush01Icon, TextFontIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { type Editor } from 'tldraw'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover'
import { SelectionStrokeWidth } from './selection-stroke-width'
import { SelectionFontSize } from './selection-font-size'

export function SelectionSizeMenu({
  editor,
  text = false,
  disabled,
}: {
  editor: Editor
  text?: boolean
  disabled: boolean
}) {
  const label = text ? '字体大小' : '笔触粗细'
  return (
    <Popover>
      <PopoverTrigger
        disabled={disabled}
        render={
          <Button
            aria-label={label}
            title={label}
            size="icon-sm"
            variant="ghost"
          />
        }
      >
        <HugeiconsIcon icon={text ? TextFontIcon : PaintBrush01Icon} />
      </PopoverTrigger>
      <PopoverContent side="top" sideOffset={10}>
        <PopoverTitle>{label}</PopoverTitle>
        {text ? (
          <SelectionFontSize editor={editor} />
        ) : (
          <SelectionStrokeWidth editor={editor} compact />
        )}
      </PopoverContent>
    </Popover>
  )
}
