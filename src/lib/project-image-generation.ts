import type { TLImageShape, TLShape } from 'tldraw'
import type { ImageGenerationSize } from '@/api/image-generation'

export const IMAGE_GENERATION_RATIOS = [
  'auto',
  '1:1',
  '2:3',
  '3:2',
  '3:4',
  '4:3',
  '9:16',
  '16:9',
] as const
export type ImageGenerationRatio = (typeof IMAGE_GENERATION_RATIOS)[number]
export const IMAGE_GENERATION_SIZES: ImageGenerationSize[] = [
  '1K',
  '1.5K',
  '2K',
]

export type ImageGenerationDraft = {
  id: string
  prompt: string
  size: ImageGenerationSize
  aspectRatio: ImageGenerationRatio
  error: string | null
}

export function getImageGenerationDraft(
  shape: TLShape | undefined,
): ImageGenerationDraft | null {
  if (shape?.type !== 'image' || (shape as TLImageShape).props.assetId)
    return null
  const draft = shape.meta.imageGeneration
  if (!draft || typeof draft !== 'object' || Array.isArray(draft)) return null
  if (
    typeof draft.id !== 'string' ||
    typeof draft.prompt !== 'string' ||
    !IMAGE_GENERATION_SIZES.includes(draft.size as ImageGenerationSize) ||
    !IMAGE_GENERATION_RATIOS.includes(draft.aspectRatio as ImageGenerationRatio)
  )
    return null
  return draft as ImageGenerationDraft
}

export function getGenerationRatioLabel(ratio: ImageGenerationRatio) {
  return ratio === 'auto' ? '智能比例' : ratio
}

export function getGenerationAspect(ratio: ImageGenerationRatio) {
  if (ratio === 'auto') return 1
  const [w, h] = ratio.split(':').map(Number)
  return w / h
}
