import { useCallback, useEffect, useRef, useState } from 'react'
import { createShapeId, type Editor } from 'tldraw'

import { generateImage, getImageGenerationError } from '@/api/image-generation'
import { createStoredImage, getProjectAssets } from '@/lib/local-asset-store'

export function useImageGeneration(editor: Editor | null) {
  const [error, setError] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const mountedRef = useRef(false)
  const scopeRef = useRef(0)
  const generatingRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true
    scopeRef.current += 1
    return () => {
      mountedRef.current = false
      scopeRef.current += 1
    }
  }, [editor])

  const generate = useCallback(
    async (prompt: string): Promise<boolean> => {
      const normalizedPrompt = prompt.trim()
      if (!editor || !normalizedPrompt || generatingRef.current) return false
      const scope = scopeRef.current
      const pageId = editor.getCurrentPageId()
      const isActive = () => scopeRef.current === scope && !editor.isDisposed
      const assertWritable = () => {
        if (editor.getCurrentPageId() !== pageId)
          throw new Error('画布页面已切换，请返回原页面后重试')
        if (editor.getIsReadonly())
          throw new Error('当前画布为只读，无法添加图片')
      }
      generatingRef.current = true
      setIsGenerating(true)
      setError(null)
      try {
        assertWritable()
        const assets = getProjectAssets(editor)
        const blob = await generateImage(normalizedPrompt)
        if (!isActive()) return false
        assertWritable()
        const file = new File([blob], `generated-${Date.now()}.png`, {
          type: 'image/png',
        })
        const asset = await createStoredImage(assets, file)
        if (!isActive()) return false
        assertWritable()
        if (asset.type !== 'image') throw new Error('生成结果不是有效的图片')
        const viewport = editor.getViewportPageBounds()
        const scale = Math.min(
          1,
          Math.max(160, Math.min(720, viewport.width * 0.55)) / asset.props.w,
          Math.max(120, Math.min(540, viewport.height * 0.55)) / asset.props.h,
        )
        const width = asset.props.w * scale
        const height = asset.props.h * scale
        const shape = {
          id: createShapeId(),
          type: 'image' as const,
          x: viewport.center.x - width / 2,
          y: viewport.center.y - height / 2,
          props: {
            assetId: asset.id,
            w: width,
            h: height,
            altText: normalizedPrompt,
          },
        }
        if (!editor.canCreateShapes([shape]))
          throw new Error('画布元素已达到上限')
        editor.markHistoryStoppingPoint('generate image')
        editor.run(() => {
          editor.createAssets([asset])
          editor.createShapes([shape])
          editor.select(shape.id)
        })
        editor.setCurrentTool('select')
        editor.focus()
        return true
      } catch (generationError) {
        if (isActive()) setError(getImageGenerationError(generationError))
        return false
      } finally {
        generatingRef.current = false
        // A replacement editor still needs its pending state released.
        if (mountedRef.current) setIsGenerating(false)
      }
    },
    [editor],
  )

  return { error, generate, isGenerating }
}
