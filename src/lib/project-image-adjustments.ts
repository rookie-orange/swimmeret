import { clamp } from 'es-toolkit'
import type { TLImageShape } from 'tldraw'

export interface ImageAdjustments {
  brightness: number
  exposure: number
  contrast: number
  saturation: number
  vibrance: number
  vignette: number
}

export const DEFAULT_IMAGE_ADJUSTMENTS: ImageAdjustments = {
  brightness: 0,
  exposure: 0,
  contrast: 0,
  saturation: 0,
  vibrance: 0,
  vignette: 0,
}

const adjustmentClasses = {
  brightness: [
    'project-image-brightness-0',
    'project-image-brightness-1',
    'project-image-brightness-2',
    'project-image-brightness-3',
    'project-image-brightness-4',
  ],
  exposure: [
    'project-image-exposure-0',
    'project-image-exposure-1',
    'project-image-exposure-2',
    'project-image-exposure-3',
    'project-image-exposure-4',
  ],
  contrast: [
    'project-image-contrast-0',
    'project-image-contrast-1',
    'project-image-contrast-2',
    'project-image-contrast-3',
    'project-image-contrast-4',
  ],
  saturation: [
    'project-image-saturation-0',
    'project-image-saturation-1',
    'project-image-saturation-2',
    'project-image-saturation-3',
    'project-image-saturation-4',
  ],
  vibrance: [
    'project-image-vibrance-0',
    'project-image-vibrance-1',
    'project-image-vibrance-2',
    'project-image-vibrance-3',
    'project-image-vibrance-4',
  ],
  vignette: [
    'project-image-vignette-0',
    'project-image-vignette-1',
    'project-image-vignette-2',
  ],
} as const

function getAdjustmentValue(value: unknown, minimum = -2) {
  return typeof value === 'number' && Number.isFinite(value)
    ? clamp(value, minimum, 2)
    : minimum > 0
      ? minimum
      : 0
}

export function getImageAdjustments(shape: TLImageShape): ImageAdjustments {
  const value = shape.meta.imageAdjustments
  if (!value || typeof value !== 'object') return DEFAULT_IMAGE_ADJUSTMENTS
  const record = value as Record<string, unknown>
  return {
    brightness: getAdjustmentValue(record.brightness),
    exposure: getAdjustmentValue(record.exposure),
    contrast: getAdjustmentValue(record.contrast),
    saturation: getAdjustmentValue(record.saturation),
    vibrance: getAdjustmentValue(record.vibrance),
    vignette: getAdjustmentValue(record.vignette, 0),
  }
}

export function getImageAdjustmentClass(
  type: keyof ImageAdjustments,
  value: number,
) {
  const index = type === 'vignette' ? Math.round(value) : Math.round(value) + 2
  return adjustmentClasses[type][index]
}
