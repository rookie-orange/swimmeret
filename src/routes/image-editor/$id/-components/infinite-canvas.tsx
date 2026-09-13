import { memo } from 'react'
import {
  DefaultDialogs,
  DefaultRichTextToolbar,
  DefaultToasts,
  Tldraw,
  type Editor,
  type TLAssetStore,
  type TLComponents,
  useEditor,
  useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'
import { cn } from '@/lib/utils'
import { getCanvasBackgroundClass } from '@/lib/canvas-background'
import { projectShapeUtils } from '@/lib/project-image-shape'

import { DecompositionLoadingOverlay } from './decomposition-loading-overlay'
import { ImageGenerationInput } from './image-generation-input'
import { ElementToolbar } from './element-toolbar'
import { ImageEditorContextMenu } from './image-editor-context-menu'

function CanvasFrontLayer() {
  return (
    <>
      <DecompositionLoadingOverlay />
      <ElementToolbar />
      <ImageGenerationInput />
    </>
  )
}

function CanvasBackground() {
  const editor = useEditor()
  const background = useValue(
    'image editor canvas background',
    () => editor.getCurrentPage()?.meta.canvasBackground,
    [editor],
  )

  return (
    <div
      className={cn('tl-background', getCanvasBackgroundClass(background))}
    />
  )
}

const canvasComponents: TLComponents = {
  Background: CanvasBackground,
  InFrontOfTheCanvas: CanvasFrontLayer,
  ActionsMenu: null,
  ContextMenu: ImageEditorContextMenu,
  Dialogs: DefaultDialogs,
  Minimap: null,
  NavigationPanel: null,
  PageMenu: null,
  RichTextToolbar: DefaultRichTextToolbar,
  StylePanel: null,
  Toasts: DefaultToasts,
  ImageToolbar: null,
  VideoToolbar: null,
  Toolbar: null,
  MenuPanel: null,
  MainMenu: null,
  HelpMenu: null,
  ZoomMenu: null,
  QuickActions: null,
  HelperButtons: null,
  SharePanel: null,
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
        locale="zh-cn"
        maxAssetSize={30 * 1024 * 1024}
        maxImageDimension={4096}
        onMount={onMount}
      />
    </div>
  )
})
