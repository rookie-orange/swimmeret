import { invoke, isTauri } from '@tauri-apps/api/core'

export type ImageGenerationSize = '1K' | '1.5K' | '2K'

function responseToArrayBuffer(response: ArrayBuffer | Uint8Array | number[]) {
  if (response instanceof ArrayBuffer && response.byteLength > 0)
    return response
  if (response instanceof Uint8Array && response.byteLength > 0)
    return response.buffer.slice(
      response.byteOffset,
      response.byteOffset + response.byteLength,
    ) as ArrayBuffer
  if (
    Array.isArray(response) &&
    response.length > 0 &&
    response.every(
      (value) => Number.isInteger(value) && value >= 0 && value <= 255,
    )
  )
    return Uint8Array.from(response).buffer
  throw new Error('图片生成返回了无效的二进制数据')
}

export async function generateImage(
  prompt: string,
  size: ImageGenerationSize = '2K',
) {
  if (!isTauri()) throw new Error('图片生成需要在桌面应用中使用')
  const normalizedPrompt = prompt.trim()
  if (!normalizedPrompt) throw new Error('请输入图片描述')
  if (Array.from(normalizedPrompt).length > 4000)
    throw new Error('图片描述不能超过 4000 个字符')
  const response = await invoke<ArrayBuffer | Uint8Array | number[]>(
    'generate_image',
    { request: { prompt: normalizedPrompt, size } },
  )
  return new Blob([responseToArrayBuffer(response)], { type: 'image/png' })
}

export function getImageGenerationError(error: unknown) {
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
  return '图片生成失败，请稍后重试'
}
