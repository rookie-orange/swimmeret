import { Channel, invoke } from '@tauri-apps/api/core'

export type LayerResolution = 'auto' | '1K' | '1.5K' | '2K'

export type LayerDecompositionProgress =
  | { stage: 'generating' }
  | { stage: 'downloading'; current: number; total: number }

export interface LayerBoundingBox {
  absolute: [number, number, number, number]
  normalized: [number, number, number, number]
}

export interface LayerManifestAsset {
  assetId: string
  zIndex: number
  width: number
  height: number
  mimeType: string
  boundingBox: LayerBoundingBox | null
  name: string | null
  description: string | null
}

export interface LayerDecompositionManifest {
  jobId: string
  model: string
  assets: LayerManifestAsset[]
  usage: {
    generatedImages: number | null
    outputTokens: number | null
    totalTokens: number | null
  } | null
}

interface StagedSource {
  sourceId: string
  width: number
  height: number
}

export async function stageLayerSource(blob: Blob) {
  return invoke<StagedSource>(
    'stage_layer_source',
    new Uint8Array(await blob.arrayBuffer()),
  )
}

export function discardLayerSource(sourceId: string) {
  return invoke<void>('discard_layer_source', { sourceId })
}

export function decomposeLayerSource(
  sourceId: string,
  prompt: string,
  size: LayerResolution,
  onProgress: (progress: LayerDecompositionProgress) => void,
) {
  const channel = new Channel<LayerDecompositionProgress>()
  channel.onmessage = onProgress

  return invoke<LayerDecompositionManifest>('decompose_image', {
    request: { sourceId, prompt, size },
    onProgress: channel,
  })
}

export async function readDecompositionAsset(jobId: string, assetId: string) {
  const response = await invoke<ArrayBuffer | Uint8Array | number[]>(
    'read_decomposition_asset',
    { jobId, assetId },
  )

  if (response instanceof ArrayBuffer) return response
  if (response instanceof Uint8Array) {
    return response.buffer.slice(
      response.byteOffset,
      response.byteOffset + response.byteLength,
    ) as ArrayBuffer
  }
  if (
    Array.isArray(response) &&
    response.length > 0 &&
    response.every(
      (value) => Number.isInteger(value) && value >= 0 && value <= 255,
    )
  ) {
    return Uint8Array.from(response).buffer
  }

  throw new Error('图层缓存返回了无效的二进制数据')
}

export function cleanupDecompositionJob(jobId: string) {
  return invoke<void>('cleanup_decomposition_job', { jobId })
}

export function getLayerDecompositionError(error: unknown) {
  if (error instanceof Error) return error.message

  if (typeof error === 'string') {
    try {
      const parsed = JSON.parse(error) as { message?: unknown }
      if (typeof parsed.message === 'string') return parsed.message
    } catch {
      return error
    }
    return error
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string') return message
  }

  return '图层分离失败，请稍后重试'
}
