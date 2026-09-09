import { memo } from 'react'
import {
  DefaultActionsMenu,
  DefaultContextMenu,
  DefaultDialogs,
  DefaultMinimap,
  DefaultNavigationPanel,
  DefaultPageMenu,
  DefaultRichTextToolbar,
  DefaultStylePanel,
  DefaultToasts,
  DefaultToolbar,
  MobileStylePanel,
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
import { ElementToolbar } from './element-toolbar'

function CanvasFrontLayer() {
  return (
    <>
      <MobileStylePanel />
      <DecompositionLoadingOverlay />
      <ElementToolbar />
    </>
  )
}

function CanvasMenuPanel() {
  return <DefaultPageMenu />
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
  ActionsMenu: DefaultActionsMenu,
  ContextMenu: DefaultContextMenu,
  Dialogs: DefaultDialogs,
  Minimap: DefaultMinimap,
  NavigationPanel: DefaultNavigationPanel,
  PageMenu: DefaultPageMenu,
  RichTextToolbar: DefaultRichTextToolbar,
  StylePanel: DefaultStylePanel,
  Toasts: DefaultToasts,
  Toolbar: DefaultToolbar,
  MenuPanel: CanvasMenuPanel,
  MainMenu: null,
  HelpMenu: null,
  QuickActions: null,
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
        locale="en"
        maxAssetSize={30 * 1024 * 1024}
        maxImageDimension={4096}
        onMount={onMount}
      />
    </div>
  )
})
