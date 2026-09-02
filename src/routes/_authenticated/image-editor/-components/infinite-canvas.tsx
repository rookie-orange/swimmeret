import { memo } from 'react'
import { Tldraw, type Editor, type TLComponents } from 'tldraw'
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
  InFrontOfTheCanvas: CanvasFrontLayer,
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
