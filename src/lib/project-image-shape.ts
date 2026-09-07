import {
  ImageShapeUtil,
  type SvgExportContext,
  type TLImageShape,
} from 'tldraw'

class ProjectImageShapeUtil extends ImageShapeUtil {
  override toSvg(shape: TLImageShape, context: SvgExportContext) {
    // Raster exports do not set shouldResolveToOriginal in tldraw; always use
    // the original before its shared SVG image cache captures the first export.
    return super.toSvg(shape, {
      ...context,
      resolveAssetUrl: (assetId) =>
        this.editor.resolveAssetUrl(assetId, {
          screenScale: 1,
          shouldResolveToOriginal: true,
        }),
    })
  }
}

export const projectShapeUtils = [ProjectImageShapeUtil]
