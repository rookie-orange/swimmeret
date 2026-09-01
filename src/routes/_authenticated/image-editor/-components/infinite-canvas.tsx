import { memo } from 'react'
import { Tldraw, type Editor, type TLComponents } from 'tldraw'
import 'tldraw/tldraw.css'

import { ElementToolbar } from './element-toolbar'

const canvasComponents: TLComponents = {
  InFrontOfTheCanvas: ElementToolbar,
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
        hideUi
        locale="en"
        maxAssetSize={20 * 1024 * 1024}
        maxImageDimension={4096}
        onMount={onMount}
      />
    </div>
  )
})
