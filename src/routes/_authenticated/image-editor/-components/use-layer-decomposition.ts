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
} from '@/lib/layer-decomposition'

import {
  calculateLayerExportScale,
  getLayerCanvasPlacement,
  type LayerCanvasBounds,
} from './layer-decomposition-utils'
import { inspectImageBlob, logImageDiagnostic } from '@/lib/image-diagnostics'
import { registerLocalAsset, releaseLocalAsset } from '@/lib/local-asset-store'

interface ManagedLayerPreview {
  url: string
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
          // 图层也要有正式 src，toImage() 才能通过 asset store 解析到真实像素。
          src: null,
          w: item.width,
        },
        meta: {
          ...(item.description == null
            ? {}
            : { decompositionDescription: item.description }),
          decompositionZIndex: item.zIndex,
        },
      }) as TLImageAsset
      asset.props.src = asset.id
      const previewUrl = registerLocalAsset(asset.id, file)
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
  const [status, setStatus] = useState<string | null>(null)
  const managedPreviewsRef = useRef(new Map<TLAssetId, ManagedLayerPreview>())
  const mountedRef = useRef(true)
  const pendingRef = useRef(false)
  const editorRef = useRef(editor)

  useEffect(() => {
    editorRef.current = editor
  }, [editor])

  const unregisterPreview = useCallback((assetId: TLAssetId) => {
    releaseLocalAsset(assetId)
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
        releaseLocalAsset(asset.id)
        managedPreviews.delete(asset.id)
      })

    return () => {
      removeAfterAssetDelete()
      for (const assetId of managedPreviews.keys()) {
        releaseLocalAsset(assetId)
      }
      managedPreviews.clear()
    }
  }, [editor])

  const startForShape = useCallback(
    async (nextShapeId: TLShapeId) => {
      if (!editor || pendingRef.current) return
      const sourceShape = editor.getShape<TLImageShape>(nextShapeId)
      if (!sourceShape || sourceShape.type !== 'image') {
        setError('待分离图片已被删除')
        return
      }
      if (sourceShape.meta.decompositionPending === true) return
      const pageBounds = editor.getShapePageBounds(sourceShape)
      if (!pageBounds) {
        setError('无法读取当前图片的位置')
        return
      }

      pendingRef.current = true
      setError(null)
      setIsOpen(true)
      setIsPending(true)
      setStatus('正在准备图片')
      let jobId: string | null = null
      let stagedSourceId: string | null = null
      let duplicateShapeId: TLShapeId | null = null

      const isEditorActive = () =>
        mountedRef.current && editorRef.current === editor

      try {
        const shapeIdsBeforeDuplicate = new Set(
          editor.getCurrentPageShapes().map((shape) => shape.id),
        )
        editor.markHistoryStoppingPoint('start image decomposition')
        editor.run(() => {
          editor.duplicateShapes([sourceShape.id], {
            x: pageBounds.width + 48,
            y: 0,
          })
          const duplicate =
            editor
              .getSelectedShapeIds()
              .map((shapeId) => editor.getShape(shapeId))
              .find((shape) => shape?.id !== sourceShape.id) ??
            editor
              .getCurrentPageShapes()
              .find((shape) => !shapeIdsBeforeDuplicate.has(shape.id))
          if (!duplicate || duplicate.type !== 'image') {
            throw new Error('无法创建分离结果副本')
          }
          duplicateShapeId = duplicate.id
          editor.updateShape<TLImageShape>({
            id: duplicate.id,
            type: 'image',
            meta: {
              ...duplicate.meta,
              decompositionPending: true,
            },
          })
          editor.select(duplicate.id)
        })

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
        const exportFormat = 'png'
        const exportScale = calculateLayerExportScale(pageBounds, naturalScale)
        logImageDiagnostic('tldraw-decomposition-input', {
          shapeId: sourceShape.id,
          assetId: sourceShape.props.assetId,
          assetMimeType:
            sourceAsset?.type === 'image' ? sourceAsset.props.mimeType : null,
          assetBytes:
            sourceAsset?.type === 'image' ? sourceAsset.props.fileSize : null,
          assetWidth:
            sourceAsset?.type === 'image' ? sourceAsset.props.w : null,
          assetHeight:
            sourceAsset?.type === 'image' ? sourceAsset.props.h : null,
          shapeWidth: sourceShape.props.w,
          shapeHeight: sourceShape.props.h,
          shapeCrop: sourceShape.props.crop,
          shapeRotation: sourceShape.rotation,
          shapeFlipX: sourceShape.props.flipX,
          shapeFlipY: sourceShape.props.flipY,
          pageBounds: {
            x: pageBounds.x,
            y: pageBounds.y,
            width: pageBounds.width,
            height: pageBounds.height,
          },
          naturalScale,
          exportScale,
          exportFormat,
          promptPresent: false,
          promptChars: 0,
          requestedSize: 'auto',
        })
        const exported = await editor.toImage([sourceShape.id], {
          background: false,
          bounds: pageBounds,
          format: exportFormat,
          padding: 0,
          pixelRatio: 1,
          scale: exportScale,
        })
        const exportedDiagnostics = await inspectImageBlob(exported.blob)
        logImageDiagnostic('tldraw-to-image-output', {
          shapeId: sourceShape.id,
          ...exportedDiagnostics,
        })
        if (!isEditorActive()) {
          throw new Error('画布已关闭，已取消图层分离')
        }
        const staged = await stageLayerSource(exported.blob)
        stagedSourceId = staged.sourceId
        logImageDiagnostic('tldraw-source-staged', {
          sourceId: staged.sourceId,
          width: staged.width,
          height: staged.height,
          exportedWidth: exportedDiagnostics.width,
          exportedHeight: exportedDiagnostics.height,
          exportedBytes: exportedDiagnostics.bytes,
          exportedMimeType: exportedDiagnostics.mimeType,
          exportedSha256: exportedDiagnostics.sha256,
        })
        if (!isEditorActive()) {
          throw new Error('画布已关闭，已取消图层分离')
        }
        const manifest = await decomposeLayerSource(
          staged.sourceId,
          '',
          'auto',
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
        const resultShape = duplicateShapeId
          ? editor.getShape<TLImageShape>(duplicateShapeId)
          : null
        if (!resultShape || resultShape.type !== 'image') {
          throw new Error('分离结果副本已被删除')
        }
        const resultBounds = editor.getShapePageBounds(resultShape)
        if (!resultBounds) {
          throw new Error('无法读取分离结果副本的位置')
        }
        const sourceBounds: LayerCanvasBounds = {
          x: resultBounds.x,
          y: resultBounds.y,
          width: resultBounds.width,
          height: resultBounds.height,
        }
        const prepared = await prepareLayers(
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
        const currentResultShape = duplicateShapeId
          ? editor.getShape<TLImageShape>(duplicateShapeId)
          : null
        if (
          !currentSourceShape ||
          currentSourceShape.type !== 'image' ||
          !currentResultShape ||
          currentResultShape.type !== 'image'
        ) {
          for (const item of prepared) {
            unregisterPreview(item.asset.id)
          }
          throw new Error('分离期间图片副本已被删除')
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

        logImageDiagnostic('tldraw-decomposition-prepared', {
          manifestLayerCount: manifest.assets.length,
          preparedLayerCount: prepared.length,
          baseLayerCount: baseLayer ? 1 : 0,
          overlayLayerCount: overlayLayers.length,
          resultShapeId: currentResultShape.id,
          resultBounds: {
            x: resultBounds.x,
            y: resultBounds.y,
            width: resultBounds.width,
            height: resultBounds.height,
          },
        })

        const mark = editor.markHistoryStoppingPoint('separate image layers')
        const groupId = createShapeId()
        try {
          editor.run(() => {
            const groupPosition = editor.getPointInParentSpace(
              currentResultShape,
              {
                x: resultBounds.x,
                y: resultBounds.y,
              },
            )
            editor.createAssets(prepared.map((item) => item.asset))
            editor.createShape<TLGroupShape>({
              id: groupId,
              parentId: currentResultShape.parentId,
              type: 'group',
              x: groupPosition.x,
              y: groupPosition.y,
              meta: { decompositionGroup: true },
              props: {},
            })
            editor.updateShape<TLImageShape>({
              id: currentResultShape.id,
              type: 'image',
              opacity: 1,
              rotation: 0,
              props: {
                assetId: baseLayer.asset.id,
                crop: null,
                flipX: false,
                flipY: false,
                h: resultBounds.height,
                w: resultBounds.width,
              },
              meta: {
                ...currentResultShape.meta,
                decompositionPending: false,
                decompositionModel: manifest.model,
                decompositionZIndex: 0,
              },
            })
            editor.createShapes(overlayLayers.map((item) => item.shape))
            if (overlayLayers.length > 0) {
              editor.reparentShapes(
                [
                  currentResultShape.id,
                  ...overlayLayers.map((item) => item.shape.id),
                ],
                groupId,
              )
            } else {
              editor.deleteShapes([groupId])
            }
            editor.select(
              overlayLayers.length > 0 ? groupId : currentResultShape.id,
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

        const writtenChildIds = editor.getSortedChildIdsForParent(groupId)
        logImageDiagnostic('tldraw-decomposition-written', {
          groupId,
          childCount: writtenChildIds.length,
          expectedChildCount: prepared.length,
          childIds: writtenChildIds,
          topLevelShapeCount: editor
            .getCurrentPageShapes()
            .filter((shape) => shape.parentId === editor.getCurrentPageId())
            .length,
        })

        editor.setCurrentTool('select')
        editor.focus()
      } catch (submitError) {
        if (duplicateShapeId && editor.getShape(duplicateShapeId)) {
          editor.deleteShapes([duplicateShapeId])
        }
        const currentSourceShape = editor.getShape<TLImageShape>(sourceShape.id)
        if (currentSourceShape?.type === 'image')
          editor.select(currentSourceShape.id)
        if (mountedRef.current) {
          const message = getLayerDecompositionError(submitError)
          logImageDiagnostic('tldraw-decomposition-failed', {
            shapeId: sourceShape.id,
            message,
          })
          setError(message)
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
        if (mountedRef.current) {
          setIsPending(false)
          setIsOpen(false)
          setStatus(null)
        }
      }
    },
    [editor, unregisterPreview],
  )

  const openForShape = useCallback(
    (nextShapeId: TLShapeId) => {
      void startForShape(nextShapeId)
    },
    [startForShape],
  )

  return {
    error,
    isPending,
    isOpen,
    openForShape,
    status,
  }
}
