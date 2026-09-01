import type { LayerManifestAsset } from '@/lib/layer-decomposition'

const MIN_INPUT_PIXELS = 512 * 512
const MAX_INPUT_PIXELS = 6000 * 6000
const MAX_EXPORT_EDGE = 4096

export interface LayerCanvasBounds {
  x: number
  y: number
  width: number
  height: number
}

export function calculateLayerExportScale(
  bounds: Pick<LayerCanvasBounds, 'height' | 'width'>,
  naturalScale = 1,
) {
  const area = bounds.width * bounds.height
  if (!Number.isFinite(area) || area <= 0) {
    throw new Error('无法读取当前图片的画布尺寸')
  }

  const minScale = Math.sqrt((MIN_INPUT_PIXELS + 4096) / area)
  const maxScale = Math.min(
    MAX_EXPORT_EDGE / bounds.width,
    MAX_EXPORT_EDGE / bounds.height,
    Math.sqrt(MAX_INPUT_PIXELS / area),
  )
  if (minScale > maxScale) {
    throw new Error('当前图片的宽高比不符合图层分离要求')
  }

  return Math.max(minScale, Math.min(Math.max(1, naturalScale), maxScale))
}

export function getLayerCanvasPlacement(
  asset: LayerManifestAsset,
  bounds: LayerCanvasBounds,
): LayerCanvasBounds {
  if (asset.zIndex === 0) return bounds

  const normalized = asset.boundingBox?.normalized
  if (!normalized) throw new Error('生成图层缺少位置数据')
  const [left, top, right, bottom] = normalized
  if (
    !normalized.every(
      (value) => Number.isFinite(value) && value >= 0 && value <= 1000,
    ) ||
    left >= right ||
    top >= bottom
  ) {
    throw new Error('生成图层的位置数据无效')
  }

  return {
    x: bounds.x + (left / 1000) * bounds.width,
    y: bounds.y + (top / 1000) * bounds.height,
    width: ((right - left) / 1000) * bounds.width,
    height: ((bottom - top) / 1000) * bounds.height,
  }
}
