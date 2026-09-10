import { useId } from 'react'
import { CursorPointer01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  ArrowShapeArrowheadEndStyle,
  ArrowShapeArrowheadStartStyle,
  ArrowShapeKindStyle,
  DefaultColorStyle,
  DefaultDashStyle,
  DefaultFillStyle,
  DefaultFontStyle,
  DefaultHorizontalAlignStyle,
  DefaultSizeStyle,
  DefaultTextAlignStyle,
  DefaultVerticalAlignStyle,
  GeoShapeGeoStyle,
  LineShapeSplineStyle,
  type Editor,
  type ReadonlySharedStyleMap,
  type StyleProp,
  type TLImageShape,
  useValue,
} from 'tldraw'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { InspectorActions } from './inspector-actions'
import { InspectorNumber, InspectorSection } from './inspector-controls'
import { InspectorImage, InspectorImageDescription } from './inspector-image'
import { InspectorTransform } from './inspector-transform'

interface ImageEditorPropertiesProps {
  editor: Editor
}
interface SelectOption {
  label: string
  value: string
}
const colorOptions = [
  { value: 'black', label: '墨黑', className: 'bg-canvas-swatch-black' },
  { value: 'grey', label: '灰色', className: 'bg-canvas-swatch-grey' },
  { value: 'red', label: '红色', className: 'bg-canvas-swatch-red' },
  {
    value: 'light-red',
    label: '浅红',
    className: 'bg-canvas-swatch-light-red',
  },
  { value: 'orange', label: '橙色', className: 'bg-canvas-swatch-orange' },
  { value: 'yellow', label: '黄色', className: 'bg-canvas-swatch-yellow' },
  { value: 'green', label: '绿色', className: 'bg-canvas-swatch-green' },
  {
    value: 'light-green',
    label: '浅绿',
    className: 'bg-canvas-swatch-light-green',
  },
  { value: 'blue', label: '蓝色', className: 'bg-canvas-swatch-blue' },
  {
    value: 'light-blue',
    label: '浅蓝',
    className: 'bg-canvas-swatch-light-blue',
  },
  { value: 'violet', label: '紫色', className: 'bg-canvas-swatch-violet' },
  {
    value: 'light-violet',
    label: '浅紫',
    className: 'bg-canvas-swatch-light-violet',
  },
  { value: 'white', label: '白色', className: 'bg-canvas-swatch-white' },
] as const

const fillOptions = [
  { value: 'none', label: '无填充' },
  { value: 'semi', label: '半透明' },
  { value: 'solid', label: '实色' },
  { value: 'pattern', label: '纹理' },
  { value: 'lined-fill', label: '线纹' },
  { value: 'fill', label: '填满' },
] as const

const dashOptions = [
  { value: 'draw', label: '手绘' },
  { value: 'solid', label: '实线' },
  { value: 'dashed', label: '虚线' },
  { value: 'dotted', label: '点线' },
] as const

const sizeOptions = [
  { value: 's', label: '细' },
  { value: 'm', label: '中' },
  { value: 'l', label: '粗' },
  { value: 'xl', label: '特粗' },
] as const

const fontOptions = [
  { value: 'draw', label: '手写' },
  { value: 'sans', label: '无衬线' },
  { value: 'serif', label: '衬线' },
  { value: 'mono', label: '等宽' },
] as const

const textAlignOptions = [
  { value: 'start', label: '左对齐' },
  { value: 'middle', label: '居中' },
  { value: 'end', label: '右对齐' },
] as const

const horizontalAlignOptions = [
  { value: 'start', label: '靠前' },
  { value: 'middle', label: '居中' },
  { value: 'end', label: '靠后' },
] as const

const verticalAlignOptions = [
  { value: 'start', label: '顶部' },
  { value: 'middle', label: '居中' },
  { value: 'end', label: '底部' },
] as const

const geoOptions = [
  { value: 'rectangle', label: '矩形' },
  { value: 'ellipse', label: '椭圆' },
  { value: 'triangle', label: '三角形' },
  { value: 'diamond', label: '菱形' },
  { value: 'star', label: '星形' },
  { value: 'pentagon', label: '五边形' },
  { value: 'hexagon', label: '六边形' },
  { value: 'octagon', label: '八边形' },
  { value: 'rhombus', label: '平行四边形' },
  { value: 'rhombus-2', label: '反向平行四边形' },
  { value: 'oval', label: '胶囊形' },
  { value: 'trapezoid', label: '梯形' },
  { value: 'arrow-left', label: '左箭头' },
  { value: 'arrow-up', label: '上箭头' },
  { value: 'arrow-down', label: '下箭头' },
  { value: 'arrow-right', label: '右箭头' },
  { value: 'cloud', label: '云朵' },
  { value: 'x-box', label: '交叉框' },
  { value: 'check-box', label: '勾选框' },
  { value: 'heart', label: '心形' },
] as const

const arrowKindOptions = [
  { value: 'arc', label: '曲线' },
  { value: 'elbow', label: '折线' },
] as const

const arrowheadOptions = [
  { value: 'none', label: '无' },
  { value: 'arrow', label: '箭头' },
  { value: 'triangle', label: '三角' },
  { value: 'dot', label: '圆点' },
  { value: 'square', label: '方形' },
  { value: 'diamond', label: '菱形' },
  { value: 'inverted', label: '反向三角' },
  { value: 'bar', label: '短线' },
] as const

const splineOptions = [
  { value: 'line', label: '直线' },
  { value: 'cubic', label: '曲线' },
] as const

type InspectorStyleValue<T> = T | 'mixed' | null

function getInspectorStyle<T>(
  styles: ReadonlySharedStyleMap,
  style: StyleProp<T>,
): InspectorStyleValue<T> {
  const value = styles.get(style)
  if (!value) return null
  return value.type === 'mixed' ? 'mixed' : value.value
}

function updateSelectedStyle<T>(editor: Editor, style: StyleProp<T>, value: T) {
  if (
    editor.getIsReadonly() ||
    editor.isIn('select.crop') ||
    editor
      .getSelectedShapes()
      .some((shape) => editor.isShapeOrAncestorLocked(shape))
  )
    return
  editor.markHistoryStoppingPoint(`change inspector style ${style.id}`)
  editor.setStyleForSelectedShapes(style, value)
  editor.focus()
}

function PropertySelect({
  disabled,
  label,
  onValueChange,
  options,
  value,
}: {
  disabled: boolean
  label: string
  onValueChange: (value: string) => void
  options: readonly SelectOption[]
  value: string | 'mixed' | null
}) {
  const id = useId()

  return (
    <Field className="gap-2">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select
        disabled={disabled}
        items={options}
        onValueChange={(nextValue) => {
          if (nextValue) onValueChange(nextValue)
        }}
        value={value === 'mixed' ? null : value}
      >
        <SelectTrigger className="w-full rounded-xl" id={id}>
          <SelectValue placeholder={value === 'mixed' ? '混合' : '未设置'} />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          <SelectGroup>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  )
}

export function ImageEditorProperties({ editor }: ImageEditorPropertiesProps) {
  const selection = useValue(
    'image editor inspector selection',
    () => {
      const shapes = editor.getSelectedShapes()
      const styles = editor.getSharedStyles()
      const onlyShape = shapes.length === 1 ? shapes[0] : null
      const opacity = editor.getSharedOpacity()

      return {
        count: shapes.length,
        hasText: shapes.some(
          (shape) =>
            shape.type === 'text' ||
            Boolean(editor.getShapeUtil(shape).getText(shape)?.trim()),
        ),
        ids: shapes.map((shape) => shape.id).join(','),
        disabled:
          editor.getIsReadonly() ||
          shapes.some((shape) => editor.isShapeOrAncestorLocked(shape)),
        cropping: editor.isIn('select.crop'),
        imageShape:
          onlyShape?.type === 'image' ? (onlyShape as TLImageShape) : null,
        shapeType: onlyShape?.type ?? null,
        color: getInspectorStyle(styles, DefaultColorStyle),
        fill: getInspectorStyle(styles, DefaultFillStyle),
        dash: getInspectorStyle(styles, DefaultDashStyle),
        size: getInspectorStyle(styles, DefaultSizeStyle),
        font: getInspectorStyle(styles, DefaultFontStyle),
        textAlign: getInspectorStyle(styles, DefaultTextAlignStyle),
        horizontalAlign: getInspectorStyle(styles, DefaultHorizontalAlignStyle),
        verticalAlign: getInspectorStyle(styles, DefaultVerticalAlignStyle),
        geo: getInspectorStyle(styles, GeoShapeGeoStyle),
        arrowKind: getInspectorStyle(styles, ArrowShapeKindStyle),
        arrowheadStart: getInspectorStyle(
          styles,
          ArrowShapeArrowheadStartStyle,
        ),
        arrowheadEnd: getInspectorStyle(styles, ArrowShapeArrowheadEndStyle),
        spline: getInspectorStyle(styles, LineShapeSplineStyle),
        opacity: opacity.type === 'mixed' ? ('mixed' as const) : opacity.value,
      }
    },
    [editor],
  )

  if (selection.count === 0)
    return (
      <div className="flex min-h-96 flex-1 flex-col items-center justify-center gap-5 p-8 text-center">
        <div className="flex size-20 items-center justify-center rounded-3xl bg-muted text-muted-foreground">
          <HugeiconsIcon
            icon={CursorPointer01Icon}
            className="size-9"
            strokeWidth={1.3}
          />
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">请选择元素进行编辑</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            选择图片、图形或文字，
            <br />
            在这里调整外观与布局
          </p>
        </div>
      </div>
    )
  const disabled = selection.disabled || selection.cropping
  const typeLabels: Record<string, string> = {
    image: '图片',
    text: '文字',
    geo: '图形',
    draw: '画笔',
    line: '线条',
    arrow: '箭头',
    group: '组合',
    note: '便签',
    frame: '画框',
  }
  const title =
    selection.count > 1
      ? '多个元素'
      : (typeLabels[selection.shapeType ?? ''] ?? '元素')
  const selectStyle = <T extends string>(
    label: string,
    style: StyleProp<T>,
    value: InspectorStyleValue<T>,
    options: readonly SelectOption[],
  ) =>
    value !== null ? (
      <PropertySelect
        disabled={disabled}
        label={label}
        value={value}
        options={options}
        onValueChange={(next) => updateSelectedStyle(editor, style, next as T)}
      />
    ) : null
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex shrink-0 flex-col gap-3 px-5 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">{title}</h2>
          <span className="text-xs text-muted-foreground">
            {selection.count > 1
              ? `已选中 ${selection.count} 个`
              : selection.disabled
                ? '已锁定或只读'
                : '当前选中'}
          </span>
        </div>
        <InspectorActions editor={editor} />
      </header>
      <Separator />
      <div className="min-h-0 flex-1 overflow-y-auto pb-5">
        {selection.imageShape ? (
          <InspectorImage
            key={selection.imageShape.id}
            editor={editor}
            shape={selection.imageShape}
            disabled={selection.disabled}
          />
        ) : null}
        <fieldset
          disabled={disabled}
          className="min-w-0 border-0 p-0 disabled:opacity-50"
        >
          {selection.geo !== null ? (
            <InspectorSection>
              {selectStyle(
                '调整形状',
                GeoShapeGeoStyle,
                selection.geo,
                geoOptions,
              )}
            </InspectorSection>
          ) : null}
          {selection.font !== null && selection.hasText ? (
            <InspectorSection title="文字">
              <div className="grid grid-cols-2 gap-2">
                {selectStyle(
                  '字体',
                  DefaultFontStyle,
                  selection.font,
                  fontOptions,
                )}
                {selectStyle('字号', DefaultSizeStyle, selection.size, [
                  { value: 's', label: '小' },
                  { value: 'm', label: '中' },
                  { value: 'l', label: '大' },
                  { value: 'xl', label: '特大' },
                ])}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {selectStyle(
                  '文字对齐',
                  DefaultTextAlignStyle,
                  selection.textAlign,
                  textAlignOptions,
                )}
                {selectStyle(
                  '标签对齐',
                  DefaultHorizontalAlignStyle,
                  selection.horizontalAlign,
                  horizontalAlignOptions,
                )}
                {selectStyle(
                  '垂直对齐',
                  DefaultVerticalAlignStyle,
                  selection.verticalAlign,
                  verticalAlignOptions,
                )}
              </div>
            </InspectorSection>
          ) : null}
          {selection.color !== null ? (
            <InspectorSection
              title={selection.shapeType === 'text' ? '文字颜色' : '颜色'}
            >
              <div className="grid grid-cols-7 gap-1">
                {colorOptions.map((option) => (
                  <Button
                    key={option.value}
                    aria-label={option.label}
                    aria-pressed={selection.color === option.value}
                    title={option.label}
                    size="icon-sm"
                    variant="ghost"
                    className={cn(
                      'rounded-lg p-1',
                      selection.color === option.value && 'ring-2 ring-ring',
                    )}
                    onClick={() =>
                      updateSelectedStyle(
                        editor,
                        DefaultColorStyle,
                        option.value,
                      )
                    }
                  >
                    <span
                      className={cn(
                        'size-5 rounded-md border border-foreground/10',
                        option.className,
                      )}
                    />
                  </Button>
                ))}
              </div>
              {selection.color === 'mixed' ? (
                <p className="text-xs text-muted-foreground">
                  当前选区包含多种颜色
                </p>
              ) : null}
            </InspectorSection>
          ) : null}
          {selection.fill !== null ? (
            <InspectorSection title="填充">
              {selectStyle(
                '填充方式',
                DefaultFillStyle,
                selection.fill,
                fillOptions,
              )}
            </InspectorSection>
          ) : null}
          {selection.dash !== null ? (
            <InspectorSection title="描边">
              <div className="grid grid-cols-2 gap-2">
                {selectStyle(
                  '线型',
                  DefaultDashStyle,
                  selection.dash,
                  dashOptions,
                )}
                {selectStyle(
                  '粗细',
                  DefaultSizeStyle,
                  selection.size,
                  sizeOptions,
                )}
              </div>
            </InspectorSection>
          ) : null}
          {selection.arrowKind !== null || selection.spline !== null ? (
            <InspectorSection title="路径">
              <div className="grid grid-cols-2 gap-2">
                {selectStyle(
                  '箭头路径',
                  ArrowShapeKindStyle,
                  selection.arrowKind,
                  arrowKindOptions,
                )}
                {selectStyle(
                  '线条路径',
                  LineShapeSplineStyle,
                  selection.spline,
                  splineOptions,
                )}
                {selectStyle(
                  '起点',
                  ArrowShapeArrowheadStartStyle,
                  selection.arrowheadStart,
                  arrowheadOptions,
                )}
                {selectStyle(
                  '终点',
                  ArrowShapeArrowheadEndStyle,
                  selection.arrowheadEnd,
                  arrowheadOptions,
                )}
              </div>
            </InspectorSection>
          ) : null}
          <InspectorSection title="不透明度">
            <div className="flex items-center gap-4">
              <Slider
                aria-label="不透明度"
                disabled={disabled}
                min={0}
                max={100}
                step={1}
                value={
                  selection.opacity === 'mixed' ? 100 : selection.opacity * 100
                }
                onPointerDown={() =>
                  editor.markHistoryStoppingPoint('change inspector opacity')
                }
                onKeyDown={() =>
                  editor.markHistoryStoppingPoint('change inspector opacity')
                }
                onValueChange={(value) =>
                  editor.setOpacityForSelectedShapes(value / 100)
                }
              />
              <div className="w-24 shrink-0">
                <InspectorNumber
                  label="不透明度数值"
                  suffix="%"
                  value={
                    selection.opacity === 'mixed'
                      ? null
                      : selection.opacity * 100
                  }
                  min={0}
                  max={100}
                  disabled={disabled}
                  onCommit={(value) => {
                    editor.markHistoryStoppingPoint('change inspector opacity')
                    editor.setOpacityForSelectedShapes(value / 100)
                  }}
                />
              </div>
            </div>
          </InspectorSection>
          <InspectorTransform
            editor={editor}
            disabled={disabled}
            key={selection.ids}
          />
          {selection.imageShape ? (
            <InspectorImageDescription
              key={selection.imageShape.id}
              editor={editor}
              shape={selection.imageShape}
              disabled={disabled}
            />
          ) : null}
        </fieldset>
      </div>
    </div>
  )
}
