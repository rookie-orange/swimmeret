import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import {
  CropIcon,
  ReplaceIcon,
  RotateCcwIcon,
  SlidersHorizontalIcon,
  Tick02Icon,
  UngroupLayersIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { type Editor, type TLImageShape, useValue } from 'tldraw'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import {
  DEFAULT_IMAGE_ADJUSTMENTS,
  getImageAdjustments,
  type ImageAdjustments,
} from '@/lib/project-image-adjustments'
import { createStoredImage, getProjectAssets } from '@/lib/local-asset-store'
import { storageError } from '@/lib/project-storage/types'
import { InspectorAction, InspectorSection } from './inspector-controls'
import { useLayerDecompositionContext } from '../-context/layer-decomposition-state'

const adjustmentsList: { key: keyof ImageAdjustments; label: string }[] = [
  { key: 'brightness', label: '亮度' },
  { key: 'exposure', label: '曝光' },
  { key: 'contrast', label: '对比度' },
  { key: 'saturation', label: '饱和度' },
  { key: 'vibrance', label: '鲜艳度' },
  { key: 'vignette', label: '暗角' },
]

export function InspectorImage({
  editor,
  shape,
  disabled,
}: {
  editor: Editor
  shape: TLImageShape
  disabled: boolean
}) {
  const [showAdjustments, setShowAdjustments] = useState(false)
  const [isReplacing, setIsReplacing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const mounted = useRef(true)
  const replacing = useRef(false)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  const isCropping = useValue(
    'inspector cropping',
    () => editor.getCroppingShapeId() === shape.id,
    [editor, shape.id],
  )
  const { isPending, openForShape } = useLayerDecompositionContext()
  const adjustments = getImageAdjustments(shape)
  const changeAdjustments = (next: Partial<ImageAdjustments>) => {
    const current = editor.getShape<TLImageShape>(shape.id)
    if (!current || disabled || editor.isShapeOrAncestorLocked(current)) return
    editor.updateShape({
      id: current.id,
      type: 'image',
      meta: {
        ...current.meta,
        imageAdjustments: { ...getImageAdjustments(current), ...next },
      },
    })
  }
  const replaceImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || disabled || replacing.current) return
    replacing.current = true
    setIsReplacing(true)
    setError(null)
    try {
      const asset = await createStoredImage(getProjectAssets(editor), file)
      if (asset.type !== 'image') return
      const current = editor.getShape<TLImageShape>(shape.id)
      if (
        !mounted.current ||
        !current ||
        editor.isShapeOrAncestorLocked(current) ||
        editor.getIsReadonly()
      )
        return
      editor.markHistoryStoppingPoint('replace inspector image')
      editor.run(() => {
        editor.createAssets([asset])
        editor.updateShape({
          id: current.id,
          type: 'image',
          props: {
            assetId: asset.id,
            crop: null,
            w: current.props.w,
            h: (current.props.w * asset.props.h) / asset.props.w,
          },
        })
      })
    } catch (cause) {
      if (mounted.current) setError(storageError(cause))
    } finally {
      replacing.current = false
      if (mounted.current) setIsReplacing(false)
    }
  }
  return (
    <>
      <InspectorSection>
        <input
          className="sr-only"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          ref={inputRef}
          onChange={(event) => void replaceImage(event)}
        />
        <Button
          className="w-full rounded-xl"
          variant="secondary"
          disabled={disabled || isReplacing || isCropping}
          onClick={() => inputRef.current?.click()}
        >
          <HugeiconsIcon data-icon="inline-start" icon={ReplaceIcon} />
          {isReplacing ? '正在替换…' : '替换图片'}
        </Button>
        <div className="grid grid-cols-3 gap-2">
          <Button
            className="h-auto flex-col gap-2 rounded-xl py-3"
            variant={isCropping ? 'default' : 'secondary'}
            disabled={disabled || isReplacing}
            onClick={() => {
              if (isCropping) {
                editor.setCroppingShape(null)
                editor.setCurrentTool('select.idle')
              } else {
                editor.setCroppingShape(shape.id)
                editor.setCurrentTool('select.crop.idle')
              }
              editor.focus()
            }}
          >
            <HugeiconsIcon icon={isCropping ? Tick02Icon : CropIcon} />
            {isCropping ? '完成裁剪' : '裁剪'}
          </Button>
          <Button
            className="h-auto flex-col gap-2 rounded-xl py-3"
            variant={showAdjustments ? 'default' : 'secondary'}
            aria-expanded={showAdjustments}
            disabled={disabled || isCropping}
            onClick={() => setShowAdjustments(!showAdjustments)}
          >
            <HugeiconsIcon icon={SlidersHorizontalIcon} />
            调色
          </Button>
          <Button
            className="h-auto flex-col gap-2 rounded-xl py-3"
            variant="secondary"
            disabled={disabled || isPending || isCropping || isReplacing}
            onClick={() => openForShape(shape.id)}
          >
            <HugeiconsIcon icon={UngroupLayersIcon} />
            {isPending ? '分离中' : '分离图层'}
          </Button>
        </div>
        {error ? (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </InspectorSection>
      {showAdjustments ? (
        <InspectorSection
          title="调色"
          action={
            <InspectorAction
              label="重置图片调整"
              icon={RotateCcwIcon}
              disabled={disabled || isCropping}
              onClick={() => {
                editor.markHistoryStoppingPoint('reset inspector adjustments')
                changeAdjustments(DEFAULT_IMAGE_ADJUSTMENTS)
              }}
            />
          }
        >
          {adjustmentsList.map(({ key, label }) => (
            <div className="flex items-center gap-3" key={key}>
              <span className="w-12 shrink-0 text-xs text-muted-foreground">
                {label}
              </span>
              <Slider
                aria-label={label}
                disabled={disabled || isCropping}
                min={key === 'vignette' ? 0 : -2}
                max={2}
                step={1}
                value={adjustments[key]}
                onPointerDown={() =>
                  editor.markHistoryStoppingPoint(`adjust image ${key}`)
                }
                onKeyDown={() =>
                  editor.markHistoryStoppingPoint(`adjust image ${key}`)
                }
                onValueChange={(value) => changeAdjustments({ [key]: value })}
              />
              <output className="w-8 shrink-0 text-right text-xs tabular-nums">
                {adjustments[key] > 0 ? '+' : ''}
                {adjustments[key]}
              </output>
            </div>
          ))}
        </InspectorSection>
      ) : null}
    </>
  )
}

export function InspectorImageDescription({
  editor,
  shape,
  disabled,
}: {
  editor: Editor
  shape: TLImageShape
  disabled: boolean
}) {
  const [draft, setDraft] = useState<string | null>(null)
  return (
    <InspectorSection title="图片说明">
      <Field className="gap-2">
        <FieldLabel
          className="sr-only"
          htmlFor={`image-description-${shape.id}`}
        >
          替代文本
        </FieldLabel>
        <Input
          id={`image-description-${shape.id}`}
          className="rounded-xl"
          disabled={disabled}
          placeholder="描述图片内容"
          value={draft ?? shape.props.altText ?? ''}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => {
            const current = editor.getShape<TLImageShape>(shape.id)
            if (
              draft !== null &&
              current &&
              !disabled &&
              draft.trim() !== current.props.altText
            ) {
              editor.markHistoryStoppingPoint('set image description')
              editor.updateShape({
                id: current.id,
                type: 'image',
                props: { altText: draft.trim() },
              })
            }
            setDraft(null)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur()
          }}
        />
      </Field>
    </InspectorSection>
  )
}
