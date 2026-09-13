import type { ReactElement } from 'react'
import { ImageGenerationPlaceholder } from '@/components/image-generation-placeholder'
import { getImageGenerationDraft } from './project-image-generation'
import { projectColorShapeUtils } from './project-shape-colors'
import {
  ImageShapeUtil,
  type SvgExportContext,
  type TLImageShape,
} from 'tldraw'
import {
  getImageAdjustmentClass,
  getImageAdjustments,
} from './project-image-adjustments'
import { cn } from './utils'

class ProjectImageShapeUtil extends ImageShapeUtil {
  override canCrop(shape: TLImageShape) {
    return !getImageGenerationDraft(shape)
  }

  override component(shape: TLImageShape) {
    if (getImageGenerationDraft(shape))
      return <ImageGenerationPlaceholder shape={shape} />
    const adjustments = getImageAdjustments(shape)
    return (
      <div
        className={cn(
          'project-image-adjustments',
          getImageAdjustmentClass('vignette', adjustments.vignette),
        )}
      >
        <div
          className={getImageAdjustmentClass(
            'brightness',
            adjustments.brightness,
          )}
        >
          <div
            className={getImageAdjustmentClass(
              'exposure',
              adjustments.exposure,
            )}
          >
            <div
              className={getImageAdjustmentClass(
                'contrast',
                adjustments.contrast,
              )}
            >
              <div
                className={getImageAdjustmentClass(
                  'saturation',
                  adjustments.saturation,
                )}
              >
                <div
                  className={getImageAdjustmentClass(
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
    if (getImageGenerationDraft(shape)) return Promise.resolve(null)
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

export const projectShapeUtils = [
  ProjectImageShapeUtil,
  ...projectColorShapeUtils,
]
