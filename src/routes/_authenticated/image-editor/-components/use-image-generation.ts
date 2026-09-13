import { useCallback, useEffect, useRef, useState } from 'react'
import {
  createShapeId,
  type Editor,
  type TLImageShape,
  type TLShapeId,
} from 'tldraw'

import { generateImage, getImageGenerationError } from '@/api/image-generation'
import { createStoredImage, getProjectAssets } from '@/lib/local-asset-store'
import {
  getImageGenerationDraft,
  type ImageGenerationDraft,
} from '@/lib/project-image-generation'

const NO_PENDING_IDS: TLShapeId[] = []

export function useImageGeneration(editor: Editor | null) {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<{
    editor: Editor | null
    ids: TLShapeId[]
  }>({ editor: null, ids: NO_PENDING_IDS })
  const pendingIds = pending.editor === editor ? pending.ids : NO_PENDING_IDS
  const scopeRef = useRef(0)
  const requests = useRef(new Map<TLShapeId, symbol>())

  useEffect(() => {
    const scope = ++scopeRef.current
    const activeRequests = requests.current
    // Deleting a pending node invalidates its request, including delete + undo.
    const dispose = editor?.sideEffects.registerAfterDeleteHandler(
      'shape',
      (shape) => {
        if (activeRequests.delete(shape.id))
          setPending({ editor, ids: [...requests.current.keys()] })
      },
    )
    return () => {
      dispose?.()
      if (scopeRef.current === scope) scopeRef.current += 1
      activeRequests.clear()
    }
  }, [editor])

  const addPlaceholder = useCallback(() => {
    if (!editor || editor.getIsReadonly()) return null
    setError(null)
    const viewport = editor.getViewportPageBounds()
    const edge = Math.max(
      120,
      Math.min(440, viewport.width * 0.45, viewport.height * 0.5),
    )
    const draft: ImageGenerationDraft = {
      id: crypto.randomUUID(),
      prompt: '',
      size: '2K',
      aspectRatio: 'auto',
      error: null,
    }
    const shape = {
      id: createShapeId(),
      type: 'image' as const,
      x: viewport.center.x - edge / 2,
      y: viewport.center.y - edge / 2,
      props: { w: edge, h: edge, altText: '图片生成' },
      meta: { imageGeneration: draft },
    }
    if (!editor.canCreateShapes([shape])) {
      setError('画布元素已达到上限')
      return null
    }
    editor.complete().setCurrentTool('select')
    editor.markHistoryStoppingPoint('add image generation placeholder')
    editor.createShapes([shape])
    editor.select(shape.id)
    editor.focus()
    return shape.id
  }, [editor])

  const generate = useCallback(
    async (shapeId: TLShapeId): Promise<boolean> => {
      if (!editor || editor.getIsReadonly() || requests.current.has(shapeId))
        return false
      const original = editor.getShape<TLImageShape>(shapeId)
      const draft = getImageGenerationDraft(original)
      if (
        !original ||
        !draft ||
        !draft.prompt.trim() ||
        editor.isShapeOrAncestorLocked(original)
      )
        return false
      const normalizedPrompt = draft.prompt.trim()
      const pageId = editor.getCurrentPageId()
      if (editor.getAncestorPageId(original) !== pageId) return false
      const scope = scopeRef.current
      const request = Symbol()
      const isActive = () =>
        scopeRef.current === scope &&
        !editor.isDisposed &&
        requests.current.get(shapeId) === request
      const writableShape = () => {
        const shape = editor.getShape<TLImageShape>(shapeId)
        if (editor.getIsReadonly())
          throw new Error('当前画布为只读，请恢复编辑后重试')
        if (
          editor.getCurrentPageId() !== pageId ||
          (shape && editor.getAncestorPageId(shape) !== pageId)
        )
          throw new Error('画布页面已切换，请返回原页面后重试')
        if (!shape || getImageGenerationDraft(shape)?.id !== draft.id)
          throw new Error('占位图已改变，请重试')
        if (editor.isShapeOrAncestorLocked(shape))
          throw new Error('占位图已锁定，请解锁后重试')
        return shape
      }
      requests.current.set(shapeId, request)
      setPending({ editor, ids: [...requests.current.keys()] })
      setError(null)
      // Drafts are persisted; pending state belongs to this running session only.
      editor.updateShape({
        id: shapeId,
        type: 'image',
        meta: {
          ...original.meta,
          imageGeneration: { ...draft, prompt: normalizedPrompt, error: null },
        },
      })
      try {
        writableShape()
        const assets = getProjectAssets(editor)
        const blob = await generateImage(
          normalizedPrompt,
          draft.size,
          draft.aspectRatio,
        )
        if (!isActive()) return false
        writableShape()
        const asset = await createStoredImage(
          assets,
          new File([blob], `generated-${Date.now()}.png`, {
            type: 'image/png',
          }),
        )
        if (!isActive()) return false
        const shape = writableShape()
        if (asset.type !== 'image') throw new Error('生成结果不是有效的图片')
        const scale = Math.min(
          shape.props.w / asset.props.w,
          shape.props.h / asset.props.h,
        )
        editor.markHistoryStoppingPoint('complete image generation')
        editor.run(() => {
          editor.createAssets([asset])
          editor.updateShape({
            id: shapeId,
            type: 'image',
            x: shape.x + (shape.props.w - asset.props.w * scale) / 2,
            y: shape.y + (shape.props.h - asset.props.h * scale) / 2,
            props: {
              assetId: asset.id,
              w: asset.props.w * scale,
              h: asset.props.h * scale,
              altText: normalizedPrompt,
            },
            meta: { ...shape.meta, imageGeneration: null },
          })
        })
        editor.markHistoryStoppingPoint('image generation completed')
        return true
      } catch (generationError) {
        if (isActive()) {
          const message = getImageGenerationError(generationError)
          setError(message)
          const shape = editor.getShape<TLImageShape>(shapeId)
          const currentDraft = getImageGenerationDraft(shape)
          if (shape && currentDraft?.id === draft.id && !editor.getIsReadonly())
            editor.run(
              () =>
                editor.updateShape({
                  id: shapeId,
                  type: 'image',
                  meta: {
                    ...shape.meta,
                    imageGeneration: { ...currentDraft, error: message },
                  },
                }),
              { history: 'ignore' },
            )
        }
        return false
      } finally {
        if (isActive()) {
          requests.current.delete(shapeId)
          setPending({ editor, ids: [...requests.current.keys()] })
        }
      }
    },
    [editor],
  )

  return {
    error,
    addPlaceholder,
    generate,
    pendingIds,
    isGenerating: pendingIds.length > 0,
  }
}
