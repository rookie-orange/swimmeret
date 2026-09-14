import { type Editor, useValue } from 'tldraw'
import { ColorPicker } from '@/components/ui/color-picker'
import { SelectionStrokeWidth } from './selection-stroke-width'
import {
  getShapeColor,
  setSelectionColor,
  supportsShapeColor,
  type ShapeColorChannel,
} from '@/lib/project-shape-colors'

export function SelectionColorPicker({
  editor,
  channel,
  compact = false,
  quick = compact,
}: {
  editor: Editor
  channel: ShapeColorChannel
  compact?: boolean
  quick?: boolean
}) {
  const selection = useValue(
    `selection ${channel} color`,
    () => {
      const shapes = editor
        .getSelectedShapes()
        .filter((shape) => supportsShapeColor(shape, channel))
      const colors = shapes.map((shape) =>
        getShapeColor(editor, shape, channel),
      )
      return {
        key: shapes.map((shape) => shape.id).join(','),
        count: shapes.length,
        color: colors.every((color) => color === colors[0]) ? colors[0] : null,
        disabled:
          editor.getIsReadonly() ||
          editor.isIn('select.crop') ||
          shapes.every((shape) => editor.isShapeOrAncestorLocked(shape)),
      }
    },
    [editor, channel],
  )
  if (!selection.count) return null
  return (
    <ColorPicker
      key={`${selection.key}-${channel}-${selection.disabled}`}
      label={
        channel === 'fill'
          ? '填充颜色'
          : channel === 'stroke'
            ? '描边颜色'
            : '文字颜色'
      }
      color={selection.color}
      compact={compact}
      quick={quick}
      stroke={channel === 'stroke'}
      allowTransparent={channel !== 'color'}
      disabled={selection.disabled}
      onInteractionStart={() =>
        editor.markHistoryStoppingPoint(`change ${channel} color`)
      }
      onChange={(color) => {
        if (!selection.disabled) setSelectionColor(editor, channel, color)
      }}
    >
      {channel === 'stroke' ? (
        <SelectionStrokeWidth editor={editor} compact />
      ) : null}
    </ColorPicker>
  )
}
