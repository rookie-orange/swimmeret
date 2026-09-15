import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from 'react'
import { clamp } from 'es-toolkit'
import {
  createShapeId,
  type Editor,
  type TLAsset,
  type TLShapePartial,
} from 'tldraw'

import { createStoredImage, getProjectAssets } from '@/lib/local-asset-store'
import { storageError } from '@/lib/project-storage/types'

export function useImageImport(editor: Editor | null) {
  const inputRef = useRef<HTMLInputElement>(null)
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

  const openFileDialog = useCallback(() => {
    if (editor && !importingRef.current) inputRef.current?.click()
  }, [editor])

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files ?? [])
      event.target.value = ''
      if (!editor || !files.length || importingRef.current) return
      importingRef.current = true
      setIsImporting(true)
      setError(null)
      const errors: string[] =
        files.length > 10 ? ['每批最多导入 10 张图片'] : []
      try {
        const assets: TLAsset[] = []
        const shapes: TLShapePartial[] = []
        const viewport = editor.getViewportPageBounds()
        for (const [index, file] of files.slice(0, 10).entries()) {
          try {
            const asset = await createStoredImage(
              getProjectAssets(editor),
              file,
            )
            if (!mountedRef.current) return
            if (asset.type !== 'image') continue
            const scale = Math.min(
              1,
              clamp(viewport.width * 0.55, 160, 720) / asset.props.w,
              clamp(viewport.height * 0.55, 120, 540) / asset.props.h,
            )
            const w = asset.props.w * scale
            const h = asset.props.h * scale
            assets.push(asset)
            shapes.push({
              id: createShapeId(),
              type: 'image',
              x: viewport.center.x - w / 2 + (index % 4) * 32,
              y: viewport.center.y - h / 2 + index * 20,
              props: { assetId: asset.id, w, h },
            })
          } catch (error) {
            errors.push(`${file.name}：${storageError(error)}`)
          }
        }
        if (!mountedRef.current || !shapes.length) return
        if (!editor.canCreateShapes(shapes))
          throw new Error('画布元素已达到上限')
        editor.markHistoryStoppingPoint('import images')
        editor.run(() => {
          editor.createAssets(assets)
          editor.createShapes(shapes)
          editor.select(...shapes.map((shape) => shape.id))
        })
        editor.setCurrentTool('select')
        editor.focus()
      } catch (error) {
        errors.push(storageError(error))
      } finally {
        importingRef.current = false
        if (mountedRef.current) {
          setIsImporting(false)
          setError(errors.length ? errors.slice(0, 2).join('；') : null)
        }
      }
    },
    [editor],
  )

  return { error, handleFileChange, inputRef, isImporting, openFileDialog }
}
