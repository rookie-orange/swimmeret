import { memo, useEffect, useState } from 'react'
import {
  DefaultCanvas,
  Tldraw,
  useEditor,
  type Editor,
  type TLComponents,
} from 'tldraw'
import 'tldraw/tldraw.css'

import { localAssetStore } from '@/lib/local-asset-store'

import { DecompositionLoadingOverlay } from './decomposition-loading-overlay'
import { ElementToolbar } from './element-toolbar'

function CanvasFrontLayer() {
  return (
    <>
      <DecompositionLoadingOverlay />
      <ElementToolbar />
    </>
  )
}

const canvasComponents: TLComponents = {
  Canvas: RefreshingCanvas,
  InFrontOfTheCanvas: CanvasFrontLayer,
}

/**
 * Re-mount the canvas after a shape deletion. WebKit can retain a stale
 * compositor tile for an SVG layer even after React has removed its DOM node;
 * replacing the canvas subtree drops that stale layer deterministically.
 */
function RefreshingCanvas() {
  const editor = useEditor()
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    const handleDeletedShapes = () => {
      editor.setHoveredShape(null)
      editor.setHintingShapes([])
      editor.setErasingShapes([])
      editor.snaps.clearIndicators()
      editor.timers.requestAnimationFrame(() => {
        setRefreshKey((currentKey) => currentKey + 1)
      })
    }

    editor.on('deleted-shapes', handleDeletedShapes)
    return () => {
      editor.off('deleted-shapes', handleDeletedShapes)
    }
  }, [editor])

  return <DefaultCanvas key={refreshKey} />
}

interface InfiniteCanvasProps {
  onMount: (editor: Editor) => void | (() => void)
}

export const InfiniteCanvas = memo(function InfiniteCanvas({
  onMount,
}: InfiniteCanvasProps) {
  return (
    <div className="relative size-full overflow-hidden bg-background">
      <Tldraw
        acceptedImageMimeTypes={['image/png', 'image/jpeg', 'image/webp']}
        className="[&_.tl-canvas]:![contain:size_layout_style] [&_.tl-canvas]:![content-visibility:visible]"
        components={canvasComponents}
        assets={localAssetStore}
        hideUi
        locale="en"
        maxAssetSize={30 * 1024 * 1024}
        maxImageDimension={4096}
        onMount={onMount}
      />
    </div>
  )
})
