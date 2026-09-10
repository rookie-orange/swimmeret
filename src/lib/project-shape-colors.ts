import {
  ArrowShapeUtil,
  DrawShapeUtil,
  GeoShapeUtil,
  HighlightShapeUtil,
  LineShapeUtil,
  TextShapeUtil,
  getColorValue,
  getDisplayValues,
  createComputedCache,
  renderHtmlFromRichTextForMeasurement,
  type Editor,
  type TLShape,
  type TLTextShape,
} from 'tldraw'
import { normalizeColor } from './color'

export type ShapeColorChannel = 'fill' | 'stroke' | 'color'
export function supportsShapeColor(shape: TLShape, channel: ShapeColorChannel) {
  if (channel === 'fill') return ['geo', 'draw', 'arrow'].includes(shape.type)
  if (channel === 'stroke')
    return ['geo', 'draw', 'arrow', 'line', 'highlight'].includes(shape.type)
  return shape.type === 'text'
}

export function getCustomShapeColor(
  shape: TLShape,
  channel: ShapeColorChannel,
) {
  const colors = shape.meta.editorColors
  if (!colors || typeof colors !== 'object' || Array.isArray(colors))
    return null
  const value = (colors as Record<string, unknown>)[channel]
  return typeof value === 'string' ? normalizeColor(value) : null
}

export function getShapeColor(
  editor: Editor,
  shape: TLShape,
  channel: ShapeColorChannel,
): string {
  if (
    channel === 'fill' &&
    'fill' in shape.props &&
    shape.props.fill === 'none'
  )
    return 'transparent'
  const custom = getCustomShapeColor(shape, channel)
  if (custom) return custom
  const util = editor.getShapeUtil(shape)
  if ('options' in util) {
    const options = util.options as {
      getDefaultDisplayValues?: (
        editor: Editor,
        shape: TLShape,
        theme: ReturnType<Editor['getCurrentTheme']>,
        mode: 'light' | 'dark',
      ) => Record<string, unknown>
    }
    const display = options.getDefaultDisplayValues?.(
      editor,
      shape,
      editor.getCurrentTheme(),
      editor.getColorMode(),
    )
    const value = display?.[channel === 'color' ? 'color' : `${channel}Color`]
    if (typeof value === 'string') return normalizeColor(value) ?? value
  }
  const name = 'color' in shape.props ? String(shape.props.color) : 'black'
  return getColorValue(
    editor.getCurrentTheme().colors[editor.getColorMode()],
    name,
    'solid',
  )
}

export function setSelectionColor(
  editor: Editor,
  channel: ShapeColorChannel,
  color: string,
) {
  const normalized = normalizeColor(color)
  if (!normalized || editor.getIsReadonly()) return
  const shapes = editor
    .getSelectedShapes()
    .filter(
      (shape) =>
        supportsShapeColor(shape, channel) &&
        !editor.isShapeOrAncestorLocked(shape),
    )
  editor.run(() => {
    for (const shape of shapes) {
      const previous = shape.meta.editorColors
      const colors =
        previous && typeof previous === 'object' && !Array.isArray(previous)
          ? previous
          : {}
      editor.updateShape({
        id: shape.id,
        type: shape.type,
        meta: {
          ...shape.meta,
          editorColors: { ...colors, [channel]: normalized },
        },
      })
      if (
        channel === 'fill' &&
        (shape.type === 'geo' ||
          shape.type === 'draw' ||
          shape.type === 'arrow')
      ) {
        editor.updateShape({
          id: shape.id,
          type: shape.type,
          props: {
            fill:
              normalized === 'transparent'
                ? 'none'
                : shape.props.fill === 'none'
                  ? 'solid'
                  : shape.props.fill,
          },
        })
      }
    }
  })
}

export function getShapeStrokeWidth(editor: Editor, shape: TLShape): number {
  const util = editor.getShapeUtil(shape)
  if (
    !(
      util instanceof GeoShapeUtil ||
      util instanceof DrawShapeUtil ||
      util instanceof HighlightShapeUtil ||
      util instanceof ArrowShapeUtil ||
      util instanceof LineShapeUtil
    )
  )
    return 0
  return (
    getDisplayValues(
      util,
      shape as Parameters<typeof util.options.getDefaultDisplayValues>[1],
    ).strokeWidth * getStrokeScale(shape)
  )
}

function getStrokeScale(shape: TLShape) {
  return 'scale' in shape.props &&
    typeof shape.props.scale === 'number' &&
    shape.props.scale > 0
    ? shape.props.scale
    : 1
}

export function setSelectionStrokeWidth(editor: Editor, width: number) {
  if (
    !Number.isFinite(width) ||
    width < 0 ||
    editor.getIsReadonly() ||
    editor.isIn('select.crop')
  )
    return
  editor.run(() => {
    for (const shape of editor.getSelectedShapes()) {
      if (
        !supportsShapeColor(shape, 'stroke') ||
        editor.isShapeOrAncestorLocked(shape)
      )
        continue
      editor.updateShape({
        id: shape.id,
        type: shape.type,
        meta: {
          ...shape.meta,
          editorStrokeWidth: width / getStrokeScale(shape),
        },
      })
    }
  })
}

function shapeDisplayColors(shape: TLShape) {
  const stroke = getCustomShapeColor(shape, 'stroke')
  const fill = getCustomShapeColor(shape, 'fill')
  const width = shape.meta.editorStrokeWidth
  const hasWidth =
    typeof width === 'number' && Number.isFinite(width) && width >= 0
  return {
    ...(stroke ? { strokeColor: stroke } : {}),
    ...(hasWidth
      ? {
          strokeWidth: width,
          strokeRoundness: width * 2,
          labelExtraPadding: width,
          ...(width === 0 ? { strokeColor: 'transparent' } : {}),
        }
      : {}),
    ...(fill
      ? {
          fillColor:
            'fill' in shape.props && shape.props.fill === 'none'
              ? 'transparent'
              : fill,
          patternFillFallbackColor: fill,
        }
      : {}),
  }
}

export function getShapeFontSize(editor: Editor, shape: TLTextShape) {
  const util = editor.getShapeUtil(shape) as TextShapeUtil
  return getDisplayValues(util, shape).fontSize * shape.props.scale
}

export function setSelectionFontSize(editor: Editor, size: number) {
  if (
    !Number.isFinite(size) ||
    size < 1 ||
    editor.getIsReadonly() ||
    editor.isIn('select.crop')
  )
    return
  editor.run(() => {
    for (const shape of editor.getSelectedShapes()) {
      if (shape.type !== 'text' || editor.isShapeOrAncestorLocked(shape))
        continue
      editor.updateShape({
        id: shape.id,
        type: shape.type,
        meta: {
          ...shape.meta,
          editorFontSize: Math.round(size) / shape.props.scale,
        },
      })
    }
  })
}

// tldraw's built-in text-size cache compares only props. Include metadata so
// custom font sizes update selection bounds and wrapping as well as rendering.
const textSizeCache = createComputedCache(
  'project text size',
  (editor: Editor, shape: TLTextShape) => {
    editor.fonts.trackFontsForShape(shape)
    const dv = getDisplayValues(
      editor.getShapeUtil(shape) as TextShapeUtil,
      shape,
    )
    const maxWidth = shape.props.autoSize
      ? null
      : Math.max(16, Math.floor(shape.props.w))
    const result = editor.textMeasure.measureHtml(
      renderHtmlFromRichTextForMeasurement(editor, shape.props.richText),
      {
        lineHeight: dv.lineHeight,
        fontWeight: dv.fontWeight,
        fontStyle: dv.fontStyle,
        padding: '0px',
        fontFamily: dv.fontFamily,
        fontSize: dv.fontSize,
        maxWidth,
      },
    )
    return {
      width: maxWidth ?? Math.max(16, result.w + 1),
      height: Math.max(dv.fontSize, result.h),
    }
  },
)

class ProjectTextShapeUtil extends TextShapeUtil {
  override getMinDimensions(shape: TLTextShape) {
    return textSizeCache.get(this.editor, shape.id)!
  }
}

// The official display-value hooks are shared by canvas rendering and SVG export.
// Metadata keeps old project snapshots compatible with the built-in shape schemas.
export const projectColorShapeUtils = [
  GeoShapeUtil.configure({
    getCustomDisplayValues: (_editor, shape) => shapeDisplayColors(shape),
  }),
  DrawShapeUtil.configure({
    getCustomDisplayValues: (_editor, shape) => shapeDisplayColors(shape),
  }),
  ArrowShapeUtil.configure({
    getCustomDisplayValues: (_editor, shape) => shapeDisplayColors(shape),
  }),
  LineShapeUtil.configure({
    getCustomDisplayValues: (_editor, shape) => shapeDisplayColors(shape),
  }),
  HighlightShapeUtil.configure({
    getCustomDisplayValues: (_editor, shape) => shapeDisplayColors(shape),
  }),
  ProjectTextShapeUtil.configure({
    getCustomDisplayValues: (_editor, shape) => {
      const color = getCustomShapeColor(shape, 'color')
      const fontSize = shape.meta.editorFontSize
      return {
        ...(color ? { color } : {}),
        ...(typeof fontSize === 'number' &&
        Number.isFinite(fontSize) &&
        fontSize > 0
          ? { fontSize }
          : {}),
      }
    },
  }),
]
