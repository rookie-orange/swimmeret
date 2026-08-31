import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from 'react'
import {
  AssetRecordType,
  createShapeId,
  type Editor,
  type TLAssetId,
  type TLImageAsset,
  type TLShapePartial,
} from 'tldraw'

const ACCEPTED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])
const MAX_BATCH_SIZE = 10
const MAX_FILE_SIZE = 20 * 1024 * 1024
const MAX_PREVIEW_EDGE = 4096

interface ManagedPreview {
  url: string
}

interface DecodedPreview {
  blob: Blob
  height: number
  width: number
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, mimeType, 0.92)
  })
}

async function decodeImage(file: File): Promise<DecodedPreview> {
  const sourceUrl = URL.createObjectURL(file)
  let bitmap: ImageBitmap | null = null
  let image: HTMLImageElement | null = null

  try {
    if ('createImageBitmap' in window) {
      try {
        bitmap = await window.createImageBitmap(file)
      } catch {
        bitmap = null
      }
    }

    if (!bitmap) {
      image = new Image()
      image.src = sourceUrl
      await image.decode()
    }

    const sourceWidth = bitmap?.width ?? image?.naturalWidth ?? 0
    const sourceHeight = bitmap?.height ?? image?.naturalHeight ?? 0
    if (!sourceWidth || !sourceHeight) {
      throw new Error('无法读取图片尺寸')
    }

    // 先限制预览像素尺寸，再交给 tldraw；原图不会进入 store。
    const scale = Math.min(
      1,
      MAX_PREVIEW_EDGE / Math.max(sourceWidth, sourceHeight),
    )
    const width = Math.max(1, Math.round(sourceWidth * scale))
    const height = Math.max(1, Math.round(sourceHeight * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('无法创建图片预览')

    context.drawImage(bitmap ?? image!, 0, 0, width, height)
    let blob = await canvasToBlob(canvas, file.type)
    if (!blob && file.type !== 'image/png') {
      blob = await canvasToBlob(canvas, 'image/png')
    }
    if (!blob) throw new Error('无法生成图片预览')

    return { blob, height, width }
  } finally {
    bitmap?.close()
    URL.revokeObjectURL(sourceUrl)
  }
}

function getDisplaySize(
  image: Pick<DecodedPreview, 'height' | 'width'>,
  viewport: { height: number; width: number },
) {
  const maxWidth = Math.max(160, Math.min(720, viewport.width * 0.55))
  const maxHeight = Math.max(120, Math.min(540, viewport.height * 0.55))
  const scale = Math.min(1, maxWidth / image.width, maxHeight / image.height)

  return {
    height: image.height * scale,
    width: image.width * scale,
  }
}

export function useImageImport(editor: Editor | null) {
  const inputRef = useRef<HTMLInputElement>(null)
  const managedPreviewsRef = useRef(new Map<TLAssetId, ManagedPreview>())
  const mountedRef = useRef(true)
  const importingRef = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!editor) return
    const managedPreviews = managedPreviewsRef.current

    const removeAfterAssetDelete =
      editor.sideEffects.registerAfterDeleteHandler('asset', (asset) => {
        const managed = managedPreviews.get(asset.id)
        if (!managed) return

        URL.revokeObjectURL(managed.url)
        managedPreviews.delete(asset.id)
      })
    const removeAfterShapeDelete =
      editor.sideEffects.registerAfterDeleteHandler('shape', (shape) => {
        if (shape.type !== 'image' || !shape.props.assetId) return

        const assetId = shape.props.assetId
        const isStillUsed = editor
          .getCurrentPageShapes()
          .some(
            (candidate) =>
              candidate.type === 'image' && candidate.props.assetId === assetId,
          )
        if (!isStillUsed && editor.getAsset(assetId)) {
          editor.deleteAssets([assetId])
        }
      })

    return () => {
      removeAfterAssetDelete()
      removeAfterShapeDelete()
      for (const managed of managedPreviews.values()) {
        if (managed.url) URL.revokeObjectURL(managed.url)
      }
      managedPreviews.clear()
    }
  }, [editor])

  const openFileDialog = useCallback(() => {
    if (!editor || importingRef.current) return
    inputRef.current?.click()
  }, [editor])

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(event.target.files ?? [])
      event.target.value = ''
      if (!editor || selectedFiles.length === 0 || importingRef.current) return

      importingRef.current = true
      setIsImporting(true)
      setError(null)

      const files = selectedFiles.slice(0, MAX_BATCH_SIZE)
      const rejectedMessages: string[] = []
      if (selectedFiles.length > MAX_BATCH_SIZE) {
        rejectedMessages.push('每批最多导入 10 张图片')
      }

      const decoded: Array<{ file: File; preview: DecodedPreview }> = []
      try {
        for (const file of files) {
          if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
            rejectedMessages.push(`${file.name}：格式不支持`)
            continue
          }
          if (file.size > MAX_FILE_SIZE) {
            rejectedMessages.push(`${file.name}：超过 20 MiB`)
            continue
          }

          try {
            const preview = await decodeImage(file)
            if (!mountedRef.current) return
            decoded.push({ file, preview })
          } catch {
            rejectedMessages.push(`${file.name}：图片解码失败`)
          }
        }

        if (!mountedRef.current || decoded.length === 0) return

        const viewport = editor.getViewportPageBounds()
        const assets: TLImageAsset[] = []
        const shapes: TLShapePartial[] = []
        const newManagedAssets: TLAssetId[] = []

        for (let index = 0; index < decoded.length; index += 1) {
          const { file, preview } = decoded[index]
          const display = getDisplaySize(preview, viewport)
          const column = index % 4
          const row = Math.floor(index / 4)
          const offsetX = column * Math.min(40, viewport.width * 0.04)
          const offsetY =
            row * Math.min(52, viewport.height * 0.06) + column * 20
          const previewFile = new File([preview.blob], file.name, {
            type: preview.blob.type || file.type,
          })
          const asset = AssetRecordType.create({
            type: 'image',
            props: {
              fileSize: preview.blob.size,
              h: preview.height,
              isAnimated: false,
              mimeType: previewFile.type,
              name: file.name,
              src: null,
              w: preview.width,
            },
            meta: {},
          }) as TLImageAsset
          const shapeId = createShapeId()
          const previewUrl = editor.createTemporaryAssetPreview(
            asset.id,
            previewFile,
          )
          if (!previewUrl) throw new Error('无法创建图片预览')

          managedPreviewsRef.current.set(asset.id, {
            url: previewUrl,
          })
          newManagedAssets.push(asset.id)
          assets.push(asset)
          shapes.push({
            id: shapeId,
            type: 'image',
            x: viewport.center.x - display.width / 2 + offsetX,
            y: viewport.center.y - display.height / 2 + offsetY,
            props: {
              assetId: asset.id,
              h: display.height,
              w: display.width,
            },
          })
        }

        if (!editor.canCreateShapes(shapes)) {
          for (const assetId of newManagedAssets) {
            const managed = managedPreviewsRef.current.get(assetId)
            if (managed) URL.revokeObjectURL(managed.url)
            managedPreviewsRef.current.delete(assetId)
          }
          rejectedMessages.push('画布元素已达到上限')
          return
        }

        editor.markHistoryStoppingPoint('import images')
        editor.run(() => {
          editor.createAssets(assets)
          editor.createShapes(shapes)
          editor.select(...shapes.map((shape) => shape.id))
        })
        editor.setCurrentTool('select')
        editor.focus()
      } finally {
        importingRef.current = false
        if (mountedRef.current) {
          setIsImporting(false)
          if (rejectedMessages.length > 0) {
            const visibleMessages = rejectedMessages.slice(0, 2)
            const remaining = rejectedMessages.length - visibleMessages.length
            setError(
              remaining > 0
                ? `${visibleMessages.join('；')}；另有 ${remaining} 项失败`
                : visibleMessages.join('；'),
            )
          }
        }
      }
    },
    [editor],
  )

  return {
    error,
    handleFileChange,
    inputRef,
    isImporting,
    openFileDialog,
  }
}
