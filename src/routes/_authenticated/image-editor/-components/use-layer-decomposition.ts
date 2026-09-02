import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AssetRecordType,
  createShapeId,
  type Editor,
  type TLAssetId,
  type TLGroupShape,
  type TLImageAsset,
  type TLImageShape,
  type TLParentId,
  type TLShapeId,
  type TLShapePartial,
} from 'tldraw'

import {
  cleanupDecompositionJob,
  decomposeLayerSource,
  discardLayerSource,
  getLayerDecompositionError,
  readDecompositionAsset,
  stageLayerSource,
  type LayerDecompositionManifest,
  type LayerResolution,
} from '@/lib/layer-decomposition'

import {
  calculateLayerExportScale,
  getLayerCanvasPlacement,
  type LayerCanvasBounds,
} from './layer-decomposition-utils'

interface ManagedLayerPreview {
  url: string
}

interface DecompositionOptions {
  prompt: string
  size: LayerResolution
}

interface PreparedLayer {
  asset: TLImageAsset
  shape: TLShapePartial<TLImageShape>
  zIndex: number
}

function createLayerName(
  name: string | null,
  zIndex: number,
  isBaseLayer: boolean,
) {
  const normalizedName = name?.trim()
  if (normalizedName) return normalizedName
  return isBaseLayer ? '底图.png' : `图层 ${zIndex}.png`
}

async function prepareLayers(
  editor: Editor,
  manifest: LayerDecompositionManifest,
  sourceBounds: LayerCanvasBounds,
  parentId: TLParentId,
  registerPreview: (assetId: TLAssetId, url: string) => void,
  unregisterPreview: (assetId: TLAssetId) => void,
  isActive: () => boolean,
) {
  const prepared: PreparedLayer[] = []
  const createdAssetIds: TLAssetId[] = []

  try {
    const layerData = await Promise.all(
      manifest.assets.map(async (item) => {
        const bytes = await readDecompositionAsset(manifest.jobId, item.assetId)
        if (!isActive()) throw new Error('画布已关闭，已取消写入图层')
        return { bytes, item }
      }),
    )

    for (const { bytes, item } of layerData) {
      if (!isActive()) throw new Error('画布已关闭，已取消写入图层')
      const placement = getLayerCanvasPlacement(item, sourceBounds)
      const name = createLayerName(item.name, item.zIndex, item.zIndex === 0)
      const file = new File([bytes], name, { type: item.mimeType })
      const asset = AssetRecordType.create({
        type: 'image',
        props: {
          fileSize: file.size,
          h: item.height,
          isAnimated: false,
          mimeType: file.type,
          name,
          src: null,
          w: item.width,
        },
        meta: {
          decompositionDescription: item.description ?? undefined,
          decompositionZIndex: item.zIndex,
        },
      }) as TLImageAsset
      const previewUrl = editor.createTemporaryAssetPreview(asset.id, file)
      if (!previewUrl) throw new Error('无法创建生成图层的画布预览')
      registerPreview(asset.id, previewUrl)
      createdAssetIds.push(asset.id)

      prepared.push({
        asset,
        shape: {
          id: createShapeId(),
          parentId,
          type: 'image',
          x: placement.x,
          y: placement.y,
          props: {
            altText: item.description ?? item.name ?? '',
            assetId: asset.id,
            h: placement.height,
            w: placement.width,
          },
          meta: {
            decompositionModel: manifest.model,
            decompositionZIndex: item.zIndex,
          },
        },
        zIndex: item.zIndex,
      })
    }

    return prepared
  } catch (error) {
    for (const assetId of createdAssetIds) {
      unregisterPreview(assetId)
    }
    throw error
  }
}

export function useLayerDecomposition(editor: Editor | null) {
  const [error, setError] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [shapeId, setShapeId] = useState<TLShapeId | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const managedPreviewsRef = useRef(new Map<TLAssetId, ManagedLayerPreview>())
  const mountedRef = useRef(true)
  const pendingRef = useRef(false)
  const editorRef = useRef(editor)

  useEffect(() => {
    editorRef.current = editor
  }, [editor])

  const unregisterPreview = useCallback((assetId: TLAssetId) => {
    const preview = managedPreviewsRef.current.get(assetId)
    if (preview) URL.revokeObjectURL(preview.url)
    managedPreviewsRef.current.delete(assetId)
  }, [])

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

    return () => {
      removeAfterAssetDelete()
      for (const managed of managedPreviews.values()) {
        URL.revokeObjectURL(managed.url)
      }
      managedPreviews.clear()
    }
  }, [editor])

  const openForShape = useCallback(
    (nextShapeId: TLShapeId) => {
      if (!editor || pendingRef.current) return
      const shape = editor.getShape(nextShapeId)
      if (!shape || shape.type !== 'image') return

      setError(null)
      setShapeId(shape.id)
      setIsOpen(true)
    },
    [editor],
  )

  const onOpenChange = useCallback((open: boolean) => {
    if (pendingRef.current) return
    setIsOpen(open)
    if (!open) {
      setError(null)
      setShapeId(null)
      setStatus(null)
    }
  }, [])

  const submit = useCallback(
    async ({ prompt, size }: DecompositionOptions) => {
      if (!editor || !shapeId || pendingRef.current) return
      const sourceShape = editor.getShape<TLImageShape>(shapeId)
      if (!sourceShape || sourceShape.type !== 'image') {
        setError('待分离图片已被删除')
        return
      }
      const pageBounds = editor.getShapePageBounds(sourceShape)
      if (!pageBounds) {
        setError('无法读取当前图片的位置')
        return
      }

      pendingRef.current = true
      setError(null)
      setIsPending(true)
      setStatus('正在准备图片')
      let jobId: string | null = null
      let stagedSourceId: string | null = null

      const isEditorActive = () =>
        mountedRef.current && editorRef.current === editor

      try {
        const sourceAsset = sourceShape.props.assetId
          ? editor.getAsset(sourceShape.props.assetId)
          : null
        const naturalScale =
          sourceAsset?.type === 'image'
            ? Math.max(
                sourceAsset.props.w / pageBounds.width,
                sourceAsset.props.h / pageBounds.height,
              )
            : 1
        const exportFormat =
          sourceAsset?.type === 'image' &&
          sourceAsset.props.mimeType === 'image/jpeg'
            ? 'jpeg'
            : 'png'
        const exportScale = calculateLayerExportScale(pageBounds, naturalScale)
        const exported = await editor.toImage([sourceShape.id], {
          background: false,
          bounds: pageBounds,
          format: exportFormat,
          padding: 0,
          pixelRatio: 1,
          scale: exportScale,
        })
        if (!isEditorActive()) {
          throw new Error('画布已关闭，已取消图层分离')
        }
        const staged = await stageLayerSource(exported.blob)
        stagedSourceId = staged.sourceId
        if (!isEditorActive()) {
          throw new Error('画布已关闭，已取消图层分离')
        }
        const manifest = await decomposeLayerSource(
          staged.sourceId,
          prompt,
          size,
          (progress) => {
            if (!isEditorActive()) return
            setStatus(
              progress.stage === 'generating'
                ? '正在识别并拆分图层'
                : `正在下载图层 ${progress.current}/${progress.total}`,
            )
          },
        )
        stagedSourceId = null
        jobId = manifest.jobId
        if (!isEditorActive()) return
        setStatus('正在写入画布')
        const sourceBounds: LayerCanvasBounds = {
          x: pageBounds.x,
          y: pageBounds.y,
          width: pageBounds.width,
          height: pageBounds.height,
        }
        const prepared = await prepareLayers(
          editor,
          manifest,
          sourceBounds,
          editor.getCurrentPageId(),
          (assetId, url) => {
            managedPreviewsRef.current.set(assetId, { url })
          },
          unregisterPreview,
          isEditorActive,
        )
        const currentSourceShape = editor.getShape<TLImageShape>(sourceShape.id)
        if (!currentSourceShape || currentSourceShape.type !== 'image') {
          for (const item of prepared) {
            unregisterPreview(item.asset.id)
          }
          throw new Error('分离期间原图片已被删除')
        }
        const baseLayer = prepared.find((item) => item.zIndex === 0)
        if (!baseLayer) {
          for (const item of prepared) unregisterPreview(item.asset.id)
          throw new Error('模型结果缺少底图')
        }
        const overlayLayers = prepared.filter((item) => item.zIndex > 0)
        if (!editor.canCreateShapes(overlayLayers.map((item) => item.shape))) {
          for (const item of prepared) unregisterPreview(item.asset.id)
          throw new Error('画布元素已达到上限')
        }

        const mark = editor.markHistoryStoppingPoint('separate image layers')
        const groupId = createShapeId()
        try {
          editor.run(() => {
            editor.createAssets(prepared.map((item) => item.asset))
            editor.createShape<TLGroupShape>({
              id: groupId,
              parentId: editor.getCurrentPageId(),
              type: 'group',
              x: pageBounds.x,
              y: pageBounds.y,
              meta: { decompositionGroup: true },
              props: {},
            })
            editor.reparentShapes(
              [groupId],
              currentSourceShape.parentId,
              currentSourceShape.index,
            )
            editor.reparentShapes([currentSourceShape.id], groupId)
            const basePosition = editor.getPointInParentSpace(groupId, {
              x: pageBounds.x,
              y: pageBounds.y,
            })
            editor.updateShape<TLImageShape>({
              id: currentSourceShape.id,
              type: 'image',
              x: basePosition.x,
              y: basePosition.y,
              opacity: 1,
              rotation: 0,
              props: {
                assetId: baseLayer.asset.id,
                crop: null,
                flipX: false,
                flipY: false,
                h: pageBounds.height,
                w: pageBounds.width,
              },
              meta: {
                ...currentSourceShape.meta,
                decompositionModel: manifest.model,
                decompositionZIndex: 0,
              },
            })
            editor.createShapes(overlayLayers.map((item) => item.shape))
            if (overlayLayers.length > 0) {
              editor.reparentShapes(
                overlayLayers.map((item) => item.shape.id),
                groupId,
              )
            }
            editor.select(
              overlayLayers.length > 0 ? groupId : currentSourceShape.id,
            )
          })
        } catch (writeError) {
          editor.bailToMark(mark)
          const createdAssetIds = prepared.map((item) => item.asset.id)
          editor.deleteAssets(
            createdAssetIds.filter((assetId) => editor.getAsset(assetId)),
          )
          for (const assetId of createdAssetIds) unregisterPreview(assetId)
          throw writeError
        }

        setIsOpen(false)
        setShapeId(null)
        setStatus(null)
        editor.setCurrentTool('select')
        editor.focus()
      } catch (submitError) {
        if (mountedRef.current) {
          setError(getLayerDecompositionError(submitError))
          setStatus(null)
        }
      } finally {
        if (stagedSourceId) {
          try {
            await discardLayerSource(stagedSourceId)
          } catch {
            // App startup clears stale staged sources.
          }
        }
        if (jobId) {
          try {
            await cleanupDecompositionJob(jobId)
          } catch {
            // App startup clears leftover cache; a cleanup failure is non-fatal.
          }
        }
        pendingRef.current = false
        if (mountedRef.current) setIsPending(false)
      }
    },
    [editor, shapeId, unregisterPreview],
  )

  return {
    dialog: {
      error,
      isPending,
      onOpenChange,
      onSubmit: submit,
      open: isOpen,
      status,
    },
    isPending,
    openForShape,
  }
}
