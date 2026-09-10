import { type Editor, useValue } from 'tldraw'
import { Slider } from '@/components/ui/slider'
import {
  getShapeStrokeWidth,
  setSelectionStrokeWidth,
  supportsShapeColor,
} from '@/lib/project-shape-colors'
import { InspectorNumber } from './inspector-controls'

export function SelectionStrokeWidth({
  editor,
  compact = false,
}: {
  editor: Editor
  compact?: boolean
}) {
  const selection = useValue(
    'selection stroke width',
    () => {
      const shapes = editor
        .getSelectedShapes()
        .filter((shape) => supportsShapeColor(shape, 'stroke'))
      const widths = shapes.map((shape) => getShapeStrokeWidth(editor, shape))
      return {
        ids: shapes.map((shape) => shape.id).join(','),
        width:
          widths.length &&
          widths.every((width) => Math.abs(width - widths[0]) < 0.001)
            ? Math.round(widths[0])
            : null,
        disabled:
          editor.getIsReadonly() ||
          editor.isIn('select.crop') ||
          shapes.every((shape) => editor.isShapeOrAncestorLocked(shape)),
      }
    },
    [editor],
  )
  const start = () => editor.markHistoryStoppingPoint('change stroke width')
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="shrink-0 text-xs text-muted-foreground">粗细</span>
      <Slider
        aria-label="描边粗细"
        disabled={selection.disabled}
        min={0}
        max={Math.max(100, selection.width ?? 0)}
        step={1}
        value={selection.width ?? 0}
        onPointerDown={start}
        onKeyDown={start}
        onValueChange={(width) =>
          setSelectionStrokeWidth(editor, Math.round(width))
        }
      />
      {compact ? (
        <output className="w-12 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
          {selection.width ?? '混合'}
        </output>
      ) : (
        <div className="w-24 shrink-0">
          <InspectorNumber
            key={selection.ids}
            label="描边粗细数值"
            value={selection.width}
            min={0}
            step={1}
            disabled={selection.disabled}
            onCommit={(width) => {
              start()
              setSelectionStrokeWidth(editor, Math.round(width))
            }}
          />
        </div>
      )}
    </div>
  )
}
