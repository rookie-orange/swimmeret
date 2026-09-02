import { useLayoutEffect, useRef } from 'react'
import { Spinner } from '@/components/ui/spinner'
import { useEditor, useValue } from 'tldraw'

export function DecompositionLoadingOverlay() {
  const editor = useEditor()
  const overlayRef = useRef<HTMLDivElement>(null)
  const placement = useValue(
    'image editor decomposition loading overlay',
    () => {
      const selectedPendingShape = editor
        .getSelectedShapeIds()
        .map((shapeId) => editor.getShape(shapeId))
        .find(
          (shape) =>
            shape?.type === 'image' && shape.meta.decompositionPending === true,
        )
      const pendingShape =
        selectedPendingShape ??
        editor
          .getCurrentPageShapes()
          .find(
            (shape) =>
              shape.type === 'image' &&
              shape.meta.decompositionPending === true,
          )
      if (!pendingShape) return null

      const pageBounds = editor.getShapePageBounds(pendingShape)
      if (!pageBounds) return null
      const viewport = editor.getViewportScreenBounds()
      const topLeft = editor.pageToScreen({
        x: pageBounds.x,
        y: pageBounds.y,
      })
      const bottomRight = editor.pageToScreen({
        x: pageBounds.maxX,
        y: pageBounds.maxY,
      })

      return {
        height: bottomRight.y - topLeft.y,
        width: bottomRight.x - topLeft.x,
        x: topLeft.x - viewport.minX,
        y: topLeft.y - viewport.minY,
      }
    },
    [editor],
  )

  useLayoutEffect(() => {
    if (!overlayRef.current || !placement) return
    overlayRef.current.style.transform = `translate3d(${placement.x}px, ${placement.y}px, 0)`
    overlayRef.current.style.width = `${Math.max(0, placement.width)}px`
    overlayRef.current.style.height = `${Math.max(0, placement.height)}px`
  }, [placement])

  if (!placement) return null

  return (
    <div
      aria-label="正在分离图层"
      className="pointer-events-none absolute top-0 left-0 z-10 flex items-center justify-center rounded-lg bg-background/45 text-foreground backdrop-blur-[1px]"
      ref={overlayRef}
      role="status"
    >
      <div className="flex items-center gap-2 rounded-full border border-border bg-card/95 px-3 py-2 text-xs shadow-lg">
        <Spinner />
        <span>正在分离</span>
      </div>
    </div>
  )
}
