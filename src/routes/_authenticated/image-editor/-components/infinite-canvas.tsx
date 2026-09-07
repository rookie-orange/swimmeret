import { memo } from 'react'
import {
  Tldraw,
  type Editor,
  type TLAssetStore,
  type TLComponents,
} from 'tldraw'
import 'tldraw/tldraw.css'
import { projectShapeUtils } from '@/lib/project-image-shape'

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
  assets: TLAssetStore
}

export const InfiniteCanvas = memo(function InfiniteCanvas({
  onMount,
  assets,
}: InfiniteCanvasProps) {
  return (
    <div className="relative size-full overflow-hidden bg-background">
      <Tldraw
        shapeUtils={projectShapeUtils}
        acceptedImageMimeTypes={['image/png', 'image/jpeg', 'image/webp']}
        components={canvasComponents}
        assets={assets}
        hideUi
        locale="en"
        maxAssetSize={30 * 1024 * 1024}
        maxImageDimension={4096}
        onMount={onMount}
      />
    </div>
  )
})
