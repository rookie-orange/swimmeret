import { type Editor, useValue } from 'tldraw'
import {
  getShapeFontSize,
  setSelectionFontSize,
} from '@/lib/project-shape-colors'
import { InspectorNumber } from './inspector-controls'

export function SelectionFontSize({ editor }: { editor: Editor }) {
  const selection = useValue(
    'selection font size',
    () => {
      const shapes = editor
        .getSelectedShapes()
        .filter((shape) => shape.type === 'text')
      const sizes = shapes.map((shape) => getShapeFontSize(editor, shape))
      return {
        ids: shapes.map((shape) => shape.id).join(','),
        size:
          sizes.length &&
          sizes.every((size) => Math.abs(size - sizes[0]) < 0.001)
            ? Math.round(sizes[0])
            : null,
        disabled:
          editor.getIsReadonly() ||
          editor.isIn('select.crop') ||
          shapes.every((shape) => editor.isShapeOrAncestorLocked(shape)),
      }
    },
    [editor],
  )
  return (
    <InspectorNumber
      key={selection.ids}
      label="字体大小"
      value={selection.size}
      min={1}
      step={1}
      disabled={selection.disabled}
      onCommit={(size) => {
        editor.markHistoryStoppingPoint('change font size')
        setSelectionFontSize(editor, size)
      }}
    />
  )
}
