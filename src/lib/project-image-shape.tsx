import type { ReactElement } from 'react'
import {
  ImageShapeUtil,
  type SvgExportContext,
  type TLImageShape,
} from 'tldraw'
import { cn } from './utils'

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
    'project-image-vignette-3',
    'project-image-vignette-4',
  ],
} as const

function getAdjustmentValue(value: unknown, minimum = -2) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(minimum, Math.min(2, value))
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

function getAdjustmentClass(type: keyof ImageAdjustments, value: number) {
  return adjustmentClasses[type][Math.round(value) + 2]
}

class ProjectImageShapeUtil extends ImageShapeUtil {
  override component(shape: TLImageShape) {
    const adjustments = getImageAdjustments(shape)
    return (
      <div
        className={cn(
          'project-image-adjustments',
          getAdjustmentClass('vignette', adjustments.vignette),
        )}
      >
        <div
          className={getAdjustmentClass('brightness', adjustments.brightness)}
        >
          <div className={getAdjustmentClass('exposure', adjustments.exposure)}>
            <div
              className={getAdjustmentClass('contrast', adjustments.contrast)}
            >
              <div
                className={getAdjustmentClass(
                  'saturation',
                  adjustments.saturation,
                )}
              >
                <div
                  className={getAdjustmentClass(
                    'vibrance',
                    adjustments.vibrance,
                  )}
                >
                  {super.component(shape)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  override toSvg(shape: TLImageShape, context: SvgExportContext) {
    const svg = super.toSvg(shape, {
      ...context,
      resolveAssetUrl: (assetId) =>
        this.editor.resolveAssetUrl(assetId, {
          screenScale: 1,
          shouldResolveToOriginal: true,
        }),
    })
    return svg.then((element) => {
      if (!element) return null
      const adjustments = getImageAdjustments(shape)
      const filterId = `project-image-adjustments-${shape.id}`
      const brightness = 1 + adjustments.brightness * 0.1
      const exposure = 1 + adjustments.exposure * 0.15
      const contrast = 1 + adjustments.contrast * 0.2
      const saturation =
        1 + adjustments.saturation * 0.25 + adjustments.vibrance * 0.15
      return (
        <g filter={`url(#${filterId})`}>
          <defs>
            <filter id={filterId} colorInterpolationFilters="sRGB">
              <feComponentTransfer>
                <feFuncR
                  type="linear"
                  slope={brightness * exposure}
                  intercept="0"
                />
                <feFuncG
                  type="linear"
                  slope={brightness * exposure}
                  intercept="0"
                />
                <feFuncB
                  type="linear"
                  slope={brightness * exposure}
                  intercept="0"
                />
              </feComponentTransfer>
              <feColorMatrix type="saturate" values={`${saturation}`} />
              <feComponentTransfer>
                <feFuncR
                  type="linear"
                  slope={contrast}
                  intercept={`${(1 - contrast) / 2}`}
                />
                <feFuncG
                  type="linear"
                  slope={contrast}
                  intercept={`${(1 - contrast) / 2}`}
                />
                <feFuncB
                  type="linear"
                  slope={contrast}
                  intercept={`${(1 - contrast) / 2}`}
                />
              </feComponentTransfer>
            </filter>
          </defs>
          {element as ReactElement}
        </g>
      )
    })
  }
}

export const projectShapeUtils = [ProjectImageShapeUtil]
