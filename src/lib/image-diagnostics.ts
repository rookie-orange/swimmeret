import { invoke } from '@tauri-apps/api/core'

export interface ImageBlobDiagnostics {
  bytes: number
  height: number
  mimeType: string
  sha256: string
  width: number
}

function bytesToHex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes), (value) =>
    value.toString(16).padStart(2, '0'),
  ).join('')
}

export async function sha256Hex(blob: Blob) {
  const bytes = await blob.arrayBuffer()
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return bytesToHex(digest)
}

export async function inspectImageBlob(
  blob: Blob,
): Promise<ImageBlobDiagnostics> {
  const url = URL.createObjectURL(blob)
  try {
    const dimensions = await new Promise<{ height: number; width: number }>(
      (resolve, reject) => {
        const image = new Image()
        image.onload = () =>
          resolve({ height: image.naturalHeight, width: image.naturalWidth })
        image.onerror = () => reject(new Error('无法读取导出图片尺寸'))
        image.src = url
      },
    )
    return {
      bytes: blob.size,
      height: dimensions.height,
      mimeType: blob.type || 'application/octet-stream',
      sha256: await sha256Hex(blob),
      width: dimensions.width,
    }
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function logImageDiagnostic(
  event: string,
  details: Record<string, unknown>,
) {
  console.info(`[swimmeret:image] ${event}`, details)
  void invoke('log_image_diagnostic', { details, event }).catch(() => {
    // Browser-only development still keeps the console diagnostic above.
  })
}
