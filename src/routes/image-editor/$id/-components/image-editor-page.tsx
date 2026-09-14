import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  Download01Icon,
  Grid3X3Icon,
  Magnet01Icon,
  PaintBrushIcon,
  Redo02Icon,
  RefreshCwIcon,
  Undo02Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { type Editor, useValue } from 'tldraw'

import { Button, buttonVariants } from '@/components/ui/button'
import { useProjectEntryTransition } from '@/components/project-entry-transition'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { ImageGenerationContext } from '@/lib/image-generation-context'
import {
  CANVAS_BACKGROUNDS,
  getCanvasBackgroundId,
} from '@/lib/canvas-background'

import { ImageEditorDock } from './image-editor-dock'
import { ImageEditorInspectorProvider } from '../-context/image-editor-inspector-state'
import { ImageEditorLayers } from './image-editor-layers'
import { ImageEditorPageMenu } from './image-editor-page-menu'
import { ImageEditorZoomControls } from './image-editor-zoom-controls'
import { InfiniteCanvas } from './infinite-canvas'
import { ExportDialog } from './export-dialog'
import { LayerDecompositionProvider } from '../-context/layer-decomposition-provider'
import { useImageImport } from '../-hooks/use-image-import'
import { useImageGeneration } from '../-hooks/use-image-generation'
import { useLayerDecomposition } from '../-hooks/use-layer-decomposition'
import { useProjectSession } from '../-hooks/use-project-session'

function HistoryControls({ editor }: { editor: Editor | null }) {
  const canUndo = useValue(
    'image editor can undo',
    () => editor?.getCanUndo() ?? false,
    [editor],
  )
  const canRedo = useValue(
    'image editor can redo',
    () => editor?.getCanRedo() ?? false,
    [editor],
  )

  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              aria-label="撤销"
              className="rounded-full"
              disabled={!canUndo}
              onClick={() => {
                editor?.undo()
                editor?.focus()
              }}
              size="icon"
              variant="ghost"
            />
          }
        >
          <HugeiconsIcon icon={Undo02Icon} />
        </TooltipTrigger>
        <TooltipContent>撤销</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              aria-label="重做"
              className="hidden rounded-full sm:inline-flex"
              disabled={!canRedo}
              onClick={() => {
                editor?.redo()
                editor?.focus()
              }}
              size="icon"
              variant="ghost"
            />
          }
        >
          <HugeiconsIcon icon={Redo02Icon} />
        </TooltipTrigger>
        <TooltipContent>重做</TooltipContent>
      </Tooltip>
    </>
  )
}

function SnapControl({ editor }: { editor: Editor | null }) {
  const isSnapMode = useValue(
    'image editor snap mode',
    () => editor?.user.getIsSnapMode() ?? false,
    [editor],
  )

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            aria-label={isSnapMode ? '关闭吸附' : '开启吸附'}
            aria-pressed={isSnapMode}
            className="rounded-full"
            disabled={!editor}
            onClick={() => {
              editor?.user.updateUserPreferences({
                isSnapMode: !editor.user.getIsSnapMode(),
              })
              editor?.focus()
            }}
            size="icon"
            variant={isSnapMode ? 'secondary' : 'ghost'}
          />
        }
      >
        <HugeiconsIcon icon={Magnet01Icon} />
      </TooltipTrigger>
      <TooltipContent>
        {isSnapMode ? '吸附已开启' : '吸附已关闭'}
      </TooltipContent>
    </Tooltip>
  )
}

function GridControl({ editor }: { editor: Editor | null }) {
  const isGridMode = useValue(
    'image editor grid mode',
    () => editor?.getInstanceState().isGridMode ?? false,
    [editor],
  )

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            aria-label={isGridMode ? '隐藏网格' : '显示网格'}
            aria-pressed={isGridMode}
            className="rounded-full"
            disabled={!editor}
            onClick={() => {
              if (!editor) return
              const next = !isGridMode
              editor.updateInstanceState({ isGridMode: next })
              editor.focus()
            }}
            size="icon"
            variant={isGridMode ? 'secondary' : 'ghost'}
          />
        }
      >
        <HugeiconsIcon icon={Grid3X3Icon} />
      </TooltipTrigger>
      <TooltipContent>{isGridMode ? '隐藏网格' : '显示网格'}</TooltipContent>
    </Tooltip>
  )
}

function BackgroundControl({ editor }: { editor: Editor | null }) {
  const [isOpen, setIsOpen] = useState(false)
  const background = useValue(
    'image editor selected canvas background',
    () =>
      getCanvasBackgroundId(editor?.getCurrentPage()?.meta.canvasBackground),
    [editor],
  )

  return (
    <div className="relative">
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              aria-expanded={isOpen}
              aria-label="画布背景"
              className="rounded-full"
              disabled={!editor}
              onClick={() => setIsOpen((open) => !open)}
              size="icon"
              variant={isOpen ? 'secondary' : 'ghost'}
            />
          }
        >
          <HugeiconsIcon icon={PaintBrushIcon} />
        </TooltipTrigger>
        <TooltipContent>画布背景</TooltipContent>
      </Tooltip>
      {isOpen && editor ? (
        <div className="absolute top-11 right-0 z-40 grid w-40 grid-cols-3 gap-2 rounded-xl border border-border bg-card p-2 shadow-xl shadow-foreground/10">
          {CANVAS_BACKGROUNDS.map((option) => (
            <Button
              aria-label={`画布背景：${option.label}`}
              aria-pressed={background === option.id}
              className={cn(
                'h-8 rounded-lg border border-border text-xs',
                background === option.id && 'ring-2 ring-ring',
              )}
              key={option.id}
              onClick={() => {
                const page = editor.getCurrentPage()
                if (!page) return
                editor.markHistoryStoppingPoint('change canvas background')
                editor.updatePage({
                  id: page.id,
                  meta: { ...page.meta, canvasBackground: option.id },
                })
                setIsOpen(false)
                editor.focus()
              }}
              size="sm"
              variant="ghost"
            >
              {option.label}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function ImageEditorPage({ projectId }: { projectId: string }) {
  const busy = useRef(false)
  const session = useProjectSession(projectId, busy)
  const { editor } = session
  const { reveal } = useProjectEntryTransition()
  useEffect(() => {
    if (editor || session.loadError) reveal(projectId)
  }, [editor, session.loadError, projectId, reveal])
  const [isExportOpen, setIsExportOpen] = useState(false)
  const [activeInspectorTab, setActiveInspectorTab] = useState<
    'layers' | 'properties'
  >('layers')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { error, handleFileChange, inputRef, isImporting, openFileDialog } =
    useImageImport(editor)
  const imageGeneration = useImageGeneration(editor)
  const layerDecomposition = useLayerDecomposition(editor)
  useEffect(() => {
    busy.current =
      isImporting ||
      layerDecomposition.isPending ||
      imageGeneration.isGenerating
  }, [imageGeneration.isGenerating, isImporting, layerDecomposition.isPending])
  const layerDecompositionContext = useMemo(
    () => ({
      isOpen: layerDecomposition.isOpen,
      isPending: layerDecomposition.isPending,
      openForShape: layerDecomposition.openForShape,
    }),
    [
      layerDecomposition.isOpen,
      layerDecomposition.isPending,
      layerDecomposition.openForShape,
    ],
  )
  const inspectorContext = useMemo(
    () => ({
      activeTab: activeInspectorTab,
      setActiveTab: setActiveInspectorTab,
    }),
    [activeInspectorTab],
  )
  if (!session.loaded || session.loadError) {
    return (
      <section className="flex h-full flex-col items-center justify-center gap-4 p-6">
        <p
          className="max-w-lg break-words text-sm"
          role={session.loadError ? 'alert' : 'status'}
        >
          {session.loadError ?? '正在读取项目…'}
        </p>
        {session.loadError ? (
          <Button onClick={session.retry}>
            <HugeiconsIcon data-icon="inline-start" icon={RefreshCwIcon} />
            重新读取
          </Button>
        ) : null}
        <Link
          to="/image-editor"
          className={buttonVariants({ variant: 'ghost' })}
        >
          返回项目
        </Link>
      </section>
    )
  }

  return (
    <ImageGenerationContext value={imageGeneration}>
      <LayerDecompositionProvider value={layerDecompositionContext}>
        <ImageEditorInspectorProvider value={inspectorContext}>
          <section
            className={cn(
              'relative h-full min-h-0 overflow-hidden bg-background',
              sidebarCollapsed
                ? '[--inspector-width:2.875rem]'
                : '[--inspector-width:20rem]',
            )}
          >
            <input
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              multiple
              onChange={handleFileChange}
              ref={inputRef}
              type="file"
            />

            <div
              className={cn(
                'pointer-events-none absolute top-8 left-2 right-[calc(var(--inspector-width)+2rem)] z-30 flex min-w-0 items-center gap-2 transition-[right] duration-300 ease-in-out sm:left-4 sm:gap-3',
              )}
            >
              <header className="pointer-events-auto flex min-w-0 items-center rounded-2xl border border-border bg-card/95 p-1 shadow-xl shadow-foreground/5 backdrop-blur-xl">
                <ImageEditorPageMenu editor={editor} />
              </header>

              <div className="min-w-0 flex-1 text-center">
                {isImporting ? (
                  <p
                    aria-live="polite"
                    className="truncate text-xs text-muted-foreground"
                    role="status"
                  >
                    正在导入图片…
                  </p>
                ) : null}
                {error ? (
                  <p
                    className="line-clamp-2 text-xs text-destructive"
                    role="alert"
                  >
                    {error}
                  </p>
                ) : null}
                {layerDecomposition.error ? (
                  <p
                    className="line-clamp-2 text-xs text-destructive"
                    role="alert"
                  >
                    {layerDecomposition.error}
                  </p>
                ) : null}
                {layerDecomposition.status ? (
                  <p
                    aria-live="polite"
                    className="truncate text-xs text-muted-foreground"
                    role="status"
                  >
                    {layerDecomposition.status}
                  </p>
                ) : null}
                {imageGeneration.error ? (
                  <p
                    className="line-clamp-2 text-xs text-destructive"
                    role="alert"
                  >
                    {imageGeneration.error}
                  </p>
                ) : null}
                {imageGeneration.isGenerating ? (
                  <p
                    aria-live="polite"
                    className="truncate text-xs text-muted-foreground"
                    role="status"
                  >
                    正在生成图片…
                  </p>
                ) : null}
              </div>

              <div className="pointer-events-auto flex min-w-0 shrink-0 items-center gap-0.5 rounded-2xl border border-border bg-card/95 p-1 shadow-xl shadow-foreground/5 backdrop-blur-xl">
                <HistoryControls editor={editor} />
                <SnapControl editor={editor} />
                <GridControl editor={editor} />
                <BackgroundControl editor={editor} />
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        aria-label="导出"
                        className="rounded-full"
                        disabled={!editor}
                        onClick={() => setIsExportOpen(true)}
                      />
                    }
                  >
                    <HugeiconsIcon
                      data-icon="inline-start"
                      icon={Download01Icon}
                    />
                    导出
                  </TooltipTrigger>
                  <TooltipContent>导出</TooltipContent>
                </Tooltip>
              </div>
            </div>

            <main className="absolute inset-0 min-h-0 min-w-0">
              <InfiniteCanvas
                onMount={session.onMount}
                assets={session.loaded.assets.store}
              />
            </main>

            <ImageEditorLayers
              editor={editor}
              collapsed={sidebarCollapsed}
              onCollapsedChange={setSidebarCollapsed}
            />
            <ImageEditorZoomControls editor={editor} />
            <ImageEditorDock
              editor={editor}
              isImporting={isImporting}
              onAddImages={openFileDialog}
              onAddGeneration={imageGeneration.addPlaceholder}
            />
          </section>
          <ExportDialog
            editor={editor}
            onOpenChange={setIsExportOpen}
            open={isExportOpen}
          />
        </ImageEditorInspectorProvider>
      </LayerDecompositionProvider>
    </ImageGenerationContext>
  )
}
