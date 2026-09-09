import { useId, useState } from 'react'
import {
  CanvasIcon,
  Grid02Icon,
  Magnet01Icon,
  RotateCcwIcon,
  SlidersHorizontalIcon,
} from '@hugeicons/core-free-icons'
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
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import {
  CANVAS_BACKGROUNDS,
  getCanvasBackgroundId,
} from '@/lib/canvas-background'
import {
  DEFAULT_IMAGE_ADJUSTMENTS,
  getImageAdjustments,
  type ImageAdjustments,
} from '@/lib/project-image-adjustments'
import { cn } from '@/lib/utils'

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

const adjustmentLabels: Array<{
  key: keyof ImageAdjustments
  label: string
}> = [
  { key: 'brightness', label: '亮度' },
  { key: 'exposure', label: '曝光' },
  { key: 'contrast', label: '对比度' },
  { key: 'saturation', label: '饱和度' },
  { key: 'vibrance', label: '鲜艳度' },
  { key: 'vignette', label: '暗角' },
]

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
  editor.markHistoryStoppingPoint(`change inspector style ${style.id}`)
  editor.setStyleForSelectedShapes(style, value)
  editor.focus()
}

function PropertySelect({
  label,
  onValueChange,
  options,
  value,
}: {
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
        items={options}
        onValueChange={(nextValue) => {
          if (nextValue) onValueChange(nextValue)
        }}
        value={value === 'mixed' ? null : value}
      >
        <SelectTrigger className="w-full" id={id} size="sm">
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

function CanvasProperties({ editor }: ImageEditorPropertiesProps) {
  const canvasState = useValue(
    'image editor canvas properties',
    () => ({
      background: getCanvasBackgroundId(
        editor.getCurrentPage()?.meta.canvasBackground,
      ),
      isGridMode: editor.getInstanceState().isGridMode,
      isSnapMode: editor.user.getIsSnapMode(),
    }),
    [editor],
  )

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-3 px-4 py-4">
        <span className="flex size-9 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
          <HugeiconsIcon icon={CanvasIcon} />
        </span>
        <div>
          <p className="text-sm font-semibold">画布</p>
          <p className="text-xs text-muted-foreground">当前页面</p>
        </div>
      </div>
      <Separator />
      <section className="flex flex-col gap-3 px-4 py-4">
        <p className="text-xs font-medium text-muted-foreground">背景</p>
        <div className="grid grid-cols-3 gap-2">
          {CANVAS_BACKGROUNDS.map((option) => (
            <Button
              aria-label={`画布背景：${option.label}`}
              aria-pressed={canvasState.background === option.id}
              className={cn(
                'h-auto flex-col gap-1.5 rounded-xl px-1 py-2 text-xs',
                canvasState.background === option.id && 'ring-2 ring-ring',
              )}
              key={option.id}
              onClick={() => {
                const page = editor.getCurrentPage()
                if (!page) return
                editor.markHistoryStoppingPoint('change canvas background')
                editor.updatePage({
                  id: page.id,
                  meta: { ...page.meta, canvasBackground: option.id },
                })
                editor.focus()
              }}
              variant="ghost"
            >
              <span
                className={cn(
                  'size-7 rounded-lg border border-border',
                  option.className,
                )}
              />
              {option.label}
            </Button>
          ))}
        </div>
      </section>
      <Separator />
      <section className="grid grid-cols-2 gap-2 px-4 py-4">
        <Button
          aria-pressed={canvasState.isGridMode}
          onClick={() => {
            editor.updateInstanceState({
              isGridMode: !editor.getInstanceState().isGridMode,
            })
            editor.focus()
          }}
          size="sm"
          variant={canvasState.isGridMode ? 'secondary' : 'outline'}
        >
          <HugeiconsIcon data-icon="inline-start" icon={Grid02Icon} />
          网格
        </Button>
        <Button
          aria-pressed={canvasState.isSnapMode}
          onClick={() => {
            editor.user.updateUserPreferences({
              isSnapMode: !editor.user.getIsSnapMode(),
            })
            editor.focus()
          }}
          size="sm"
          variant={canvasState.isSnapMode ? 'secondary' : 'outline'}
        >
          <HugeiconsIcon data-icon="inline-start" icon={Magnet01Icon} />
          吸附
        </Button>
      </section>
    </div>
  )
}

function ImageAltTextField({
  editor,
  shape,
}: {
  editor: Editor
  shape: TLImageShape
}) {
  const [altText, setAltText] = useState(shape.props.altText ?? '')

  const save = () => {
    const currentShape = editor.getShape<TLImageShape>(shape.id)
    if (!currentShape || currentShape.props.altText === altText.trim()) return
    editor.markHistoryStoppingPoint('set image alt text')
    editor.updateShape({
      id: currentShape.id,
      type: currentShape.type,
      props: { altText: altText.trim() },
    })
  }

  return (
    <Field className="gap-2">
      <FieldLabel htmlFor={`image-alt-text-${shape.id}`}>替代文本</FieldLabel>
      <Input
        id={`image-alt-text-${shape.id}`}
        onBlur={save}
        onChange={(event) => setAltText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur()
        }}
        placeholder="描述图片内容"
        value={altText}
      />
    </Field>
  )
}

function ImageAdjustmentControls({
  editor,
  shape,
}: {
  editor: Editor
  shape: TLImageShape
}) {
  const adjustments = getImageAdjustments(shape)

  const updateAdjustment = (key: keyof ImageAdjustments, value: number) => {
    const currentShape = editor.getShape<TLImageShape>(shape.id)
    if (!currentShape) return
    editor.updateShape({
      id: currentShape.id,
      type: currentShape.type,
      meta: {
        ...currentShape.meta,
        imageAdjustments: {
          ...getImageAdjustments(currentShape),
          [key]: value,
        },
      },
    })
  }

  return (
    <section className="flex flex-col gap-4 px-4 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HugeiconsIcon
            className="text-muted-foreground"
            icon={SlidersHorizontalIcon}
          />
          <p className="text-xs font-medium text-muted-foreground">图片调整</p>
        </div>
        <Button
          aria-label="重置图片调整"
          onClick={() => {
            const currentShape = editor.getShape<TLImageShape>(shape.id)
            if (!currentShape) return
            editor.markHistoryStoppingPoint('reset image adjustments')
            editor.updateShape({
              id: currentShape.id,
              type: currentShape.type,
              meta: {
                ...currentShape.meta,
                imageAdjustments: { ...DEFAULT_IMAGE_ADJUSTMENTS },
              },
            })
            editor.focus()
          }}
          size="icon-xs"
          variant="ghost"
        >
          <HugeiconsIcon icon={RotateCcwIcon} />
        </Button>
      </div>
      <div className="flex flex-col gap-4">
        {adjustmentLabels.map(({ key, label }) => (
          <label className="flex flex-col gap-2" key={key}>
            <span className="flex items-center justify-between text-xs">
              <span>{label}</span>
              <output className="tabular-nums text-muted-foreground">
                {adjustments[key]}
              </output>
            </span>
            <Slider
              aria-label={label}
              max={2}
              min={key === 'vignette' ? 0 : -2}
              onKeyDown={() =>
                editor.markHistoryStoppingPoint(`adjust image ${key}`)
              }
              onPointerDown={() =>
                editor.markHistoryStoppingPoint(`adjust image ${key}`)
              }
              onValueChange={(value) => updateAdjustment(key, value)}
              step={1}
              value={adjustments[key]}
            />
          </label>
        ))}
      </div>
      <ImageAltTextField editor={editor} key={shape.id} shape={shape} />
    </section>
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

  if (selection.count === 0) return <CanvasProperties editor={editor} />

  const hasAppearanceStyles =
    selection.color !== null ||
    selection.fill !== null ||
    selection.dash !== null ||
    selection.size !== null ||
    selection.font !== null

  return (
    <div className="flex min-h-0 flex-col overflow-y-auto">
      <div className="flex items-center gap-3 px-4 py-4">
        <span className="flex size-9 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
          <HugeiconsIcon icon={SlidersHorizontalIcon} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {selection.count === 1
              ? selection.shapeType === 'image'
                ? '图片属性'
                : '元素属性'
              : `${selection.count} 个元素`}
          </p>
          <p className="text-xs text-muted-foreground">
            {selection.count === 1 ? selection.shapeType : '混合选择'}
          </p>
        </div>
      </div>
      <Separator />

      {hasAppearanceStyles ? (
        <>
          <section className="flex flex-col gap-4 px-4 py-4">
            <p className="text-xs font-medium text-muted-foreground">外观</p>
            {selection.color !== null ? (
              <div className="flex flex-col gap-2">
                <p className="text-xs">颜色</p>
                <div className="grid grid-cols-6 gap-1.5">
                  {colorOptions.map((option) => (
                    <Button
                      aria-label={option.label}
                      aria-pressed={selection.color === option.value}
                      className={cn(
                        'rounded-lg border border-transparent p-1',
                        selection.color === option.value &&
                          'border-border ring-2 ring-ring',
                      )}
                      key={option.value}
                      onClick={() =>
                        updateSelectedStyle(
                          editor,
                          DefaultColorStyle,
                          option.value,
                        )
                      }
                      size="icon-sm"
                      title={option.label}
                      variant="ghost"
                    >
                      <span
                        className={cn(
                          'size-5 rounded-full border border-foreground/10',
                          option.className,
                        )}
                      />
                    </Button>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              {selection.fill !== null ? (
                <PropertySelect
                  label="填充"
                  onValueChange={(value) =>
                    updateSelectedStyle(
                      editor,
                      DefaultFillStyle,
                      value as (typeof fillOptions)[number]['value'],
                    )
                  }
                  options={fillOptions}
                  value={selection.fill}
                />
              ) : null}
              {selection.dash !== null ? (
                <PropertySelect
                  label="线条"
                  onValueChange={(value) =>
                    updateSelectedStyle(
                      editor,
                      DefaultDashStyle,
                      value as (typeof dashOptions)[number]['value'],
                    )
                  }
                  options={dashOptions}
                  value={selection.dash}
                />
              ) : null}
              {selection.size !== null ? (
                <PropertySelect
                  label="粗细"
                  onValueChange={(value) =>
                    updateSelectedStyle(
                      editor,
                      DefaultSizeStyle,
                      value as (typeof sizeOptions)[number]['value'],
                    )
                  }
                  options={sizeOptions}
                  value={selection.size}
                />
              ) : null}
              {selection.font !== null ? (
                <PropertySelect
                  label="字体"
                  onValueChange={(value) =>
                    updateSelectedStyle(
                      editor,
                      DefaultFontStyle,
                      value as (typeof fontOptions)[number]['value'],
                    )
                  }
                  options={fontOptions}
                  value={selection.font}
                />
              ) : null}
            </div>
          </section>
          <Separator />
        </>
      ) : null}

      <section className="flex flex-col gap-3 px-4 py-4">
        <label className="flex flex-col gap-2">
          <span className="flex items-center justify-between text-xs">
            <span>不透明度</span>
            <output className="tabular-nums text-muted-foreground">
              {selection.opacity === 'mixed'
                ? '混合'
                : `${Math.round(selection.opacity * 100)}%`}
            </output>
          </span>
          <Slider
            aria-label="不透明度"
            max={100}
            min={0}
            onKeyDown={() =>
              editor.markHistoryStoppingPoint('change shape opacity')
            }
            onPointerDown={() =>
              editor.markHistoryStoppingPoint('change shape opacity')
            }
            onValueChange={(value) =>
              editor.setOpacityForSelectedShapes(value / 100)
            }
            step={5}
            value={
              selection.opacity === 'mixed' ? 100 : selection.opacity * 100
            }
          />
        </label>
      </section>

      {selection.geo !== null ||
      selection.arrowKind !== null ||
      selection.spline !== null ? (
        <>
          <Separator />
          <section className="grid grid-cols-2 gap-3 px-4 py-4">
            {selection.geo !== null ? (
              <PropertySelect
                label="形状"
                onValueChange={(value) =>
                  updateSelectedStyle(
                    editor,
                    GeoShapeGeoStyle,
                    value as (typeof geoOptions)[number]['value'],
                  )
                }
                options={geoOptions}
                value={selection.geo}
              />
            ) : null}
            {selection.arrowKind !== null ? (
              <PropertySelect
                label="箭头路径"
                onValueChange={(value) =>
                  updateSelectedStyle(
                    editor,
                    ArrowShapeKindStyle,
                    value as (typeof arrowKindOptions)[number]['value'],
                  )
                }
                options={arrowKindOptions}
                value={selection.arrowKind}
              />
            ) : null}
            {selection.spline !== null ? (
              <PropertySelect
                label="线条路径"
                onValueChange={(value) =>
                  updateSelectedStyle(
                    editor,
                    LineShapeSplineStyle,
                    value as (typeof splineOptions)[number]['value'],
                  )
                }
                options={splineOptions}
                value={selection.spline}
              />
            ) : null}
            {selection.arrowheadStart !== null ? (
              <PropertySelect
                label="起点"
                onValueChange={(value) =>
                  updateSelectedStyle(
                    editor,
                    ArrowShapeArrowheadStartStyle,
                    value as (typeof arrowheadOptions)[number]['value'],
                  )
                }
                options={arrowheadOptions}
                value={selection.arrowheadStart}
              />
            ) : null}
            {selection.arrowheadEnd !== null ? (
              <PropertySelect
                label="终点"
                onValueChange={(value) =>
                  updateSelectedStyle(
                    editor,
                    ArrowShapeArrowheadEndStyle,
                    value as (typeof arrowheadOptions)[number]['value'],
                  )
                }
                options={arrowheadOptions}
                value={selection.arrowheadEnd}
              />
            ) : null}
          </section>
        </>
      ) : null}

      {selection.textAlign !== null ||
      selection.horizontalAlign !== null ||
      selection.verticalAlign !== null ? (
        <>
          <Separator />
          <section className="grid grid-cols-2 gap-3 px-4 py-4">
            {selection.textAlign !== null ? (
              <PropertySelect
                label="文字对齐"
                onValueChange={(value) =>
                  updateSelectedStyle(
                    editor,
                    DefaultTextAlignStyle,
                    value as (typeof textAlignOptions)[number]['value'],
                  )
                }
                options={textAlignOptions}
                value={selection.textAlign}
              />
            ) : null}
            {selection.horizontalAlign !== null ? (
              <PropertySelect
                label="标签对齐"
                onValueChange={(value) =>
                  updateSelectedStyle(
                    editor,
                    DefaultHorizontalAlignStyle,
                    value as (typeof horizontalAlignOptions)[number]['value'],
                  )
                }
                options={horizontalAlignOptions}
                value={selection.horizontalAlign}
              />
            ) : null}
            {selection.verticalAlign !== null ? (
              <PropertySelect
                label="垂直对齐"
                onValueChange={(value) =>
                  updateSelectedStyle(
                    editor,
                    DefaultVerticalAlignStyle,
                    value as (typeof verticalAlignOptions)[number]['value'],
                  )
                }
                options={verticalAlignOptions}
                value={selection.verticalAlign}
              />
            ) : null}
          </section>
        </>
      ) : null}

      {selection.imageShape ? (
        <>
          <Separator />
          <ImageAdjustmentControls
            editor={editor}
            key={selection.imageShape.id}
            shape={selection.imageShape}
          />
        </>
      ) : null}
    </div>
  )
}
