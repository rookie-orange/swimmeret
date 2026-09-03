import { useCallback, useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  ArrowLeft01Icon,
  Download01Icon,
  Magnet01Icon,
  Redo02Icon,
  Undo02Icon,
  ViewIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { type Editor, getUserPreferences, useValue } from 'tldraw'

import { Button, buttonVariants } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

import { ImageEditorDock } from './image-editor-dock'
import { ImageEditorLayers } from './image-editor-layers'
import { InfiniteCanvas } from './infinite-canvas'
import { ExportDialog } from './export-dialog'
import { LayerDecompositionProvider } from './layer-decomposition-provider'
import { useImageImport } from './use-image-import'
import { useLayerDecomposition } from './use-layer-decomposition'

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

export function ImageEditorPage() {
  const [editor, setEditor] = useState<Editor | null>(null)
  const [isExportOpen, setIsExportOpen] = useState(false)
  const { error, handleFileChange, inputRef, isImporting, openFileDialog } =
    useImageImport(editor)
  const layerDecomposition = useLayerDecomposition(editor)
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
  const handleMount = useCallback((mountedEditor: Editor) => {
    if (getUserPreferences().isSnapMode == null) {
      mountedEditor.user.updateUserPreferences({ isSnapMode: true })
    }

    mountedEditor.centerOnPoint({ x: 0, y: 0 })
    setEditor(mountedEditor)

    return () => {
      setEditor((currentEditor) =>
        currentEditor === mountedEditor ? null : currentEditor,
      )
    }
  }, [])

  return (
    <LayerDecompositionProvider value={layerDecompositionContext}>
      <section className="relative h-full min-h-0 overflow-hidden bg-background">
        <input
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          multiple
          onChange={handleFileChange}
          ref={inputRef}
          type="file"
        />

        <div className="pointer-events-none absolute top-2 right-2 left-2 z-20 flex min-w-0 items-center gap-2 sm:top-4 sm:right-4 sm:left-4 sm:gap-3 xl:right-80">
          <header className="pointer-events-auto flex min-w-0 shrink-0 items-center gap-2 rounded-2xl border border-border bg-card/95 p-1 shadow-xl shadow-foreground/5 backdrop-blur-xl">
            <Link
              aria-label="返回聊天"
              className={cn(
                buttonVariants({ size: 'icon-sm', variant: 'ghost' }),
                'shrink-0 rounded-full text-muted-foreground',
              )}
              to="/"
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} />
            </Link>
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
              <p className="line-clamp-2 text-xs text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            {layerDecomposition.error ? (
              <p className="line-clamp-2 text-xs text-destructive" role="alert">
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
          </div>

          <div className="pointer-events-auto flex min-w-0 shrink-0 items-center gap-0.5 rounded-2xl border border-border bg-card/95 p-1 shadow-xl shadow-foreground/5 backdrop-blur-xl">
            <HistoryControls editor={editor} />
            <SnapControl editor={editor} />
            <Button
              className="hidden rounded-full xl:inline-flex"
              disabled
              variant="ghost"
            >
              <HugeiconsIcon data-icon="inline-start" icon={ViewIcon} />
              预览
            </Button>
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
                <HugeiconsIcon data-icon="inline-start" icon={Download01Icon} />
                导出
              </TooltipTrigger>
              <TooltipContent>导出</TooltipContent>
            </Tooltip>
          </div>
        </div>

        <main className="absolute inset-0 min-h-0 min-w-0">
          <InfiniteCanvas onMount={handleMount} />
        </main>

        <ImageEditorLayers editor={editor} onAddImages={openFileDialog} />
        <ImageEditorDock
          editor={editor}
          isImporting={isImporting}
          onAddImages={openFileDialog}
        />
      </section>
      <ExportDialog
        editor={editor}
        onOpenChange={setIsExportOpen}
        open={isExportOpen}
      />
    </LayerDecompositionProvider>
  )
}
