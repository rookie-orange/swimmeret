import { useCallback, useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  ArrowLeft01Icon,
  Redo02Icon,
  Undo02Icon,
  ViewIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { type Editor, useValue } from 'tldraw'

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
import { useImageImport } from './use-image-import'

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
              size="icon-sm"
              variant="ghost"
            />
          }
        >
          <HugeiconsIcon icon={Undo02Icon} strokeWidth={1.8} />
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
              size="icon-sm"
              variant="ghost"
            />
          }
        >
          <HugeiconsIcon icon={Redo02Icon} strokeWidth={1.8} />
        </TooltipTrigger>
        <TooltipContent>重做</TooltipContent>
      </Tooltip>
    </>
  )
}

export function ImageEditorPage() {
  const [editor, setEditor] = useState<Editor | null>(null)
  const { error, handleFileChange, inputRef, isImporting, openFileDialog } =
    useImageImport(editor)
  const handleMount = useCallback((mountedEditor: Editor) => {
    mountedEditor.centerOnPoint({ x: 0, y: 0 })
    setEditor(mountedEditor)

    return () => {
      setEditor((currentEditor) =>
        currentEditor === mountedEditor ? null : currentEditor,
      )
    }
  }, [])

  return (
    <section className="grid h-full min-h-0 grid-cols-1 grid-rows-[auto_minmax(0,1fr)_auto] gap-3 overflow-hidden bg-muted/40 p-2 sm:gap-4 sm:p-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:grid-rows-[auto_minmax(0,1fr)_auto]">
      <input
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        multiple
        onChange={handleFileChange}
        ref={inputRef}
        type="file"
      />

      <div className="col-start-1 row-start-1 flex min-w-0 items-center gap-2 sm:gap-3">
        <header className="flex h-14 min-w-0 shrink-0 items-center gap-2 rounded-2xl border border-border bg-card/95 p-2 shadow-xl shadow-foreground/5 backdrop-blur-xl">
          <Link
            aria-label="返回聊天"
            className={cn(
              buttonVariants({ size: 'icon-sm', variant: 'ghost' }),
              'shrink-0 rounded-full text-muted-foreground',
            )}
            to="/"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={1.8} />
          </Link>
          <div className="hidden min-w-0 pr-2 sm:block">
            <p className="truncate text-sm font-semibold">无限画布</p>
            <p className="text-xs text-muted-foreground">当前会话</p>
          </div>
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
        </div>

        <div className="flex h-14 min-w-0 shrink-0 items-center gap-0.5 rounded-2xl border border-border bg-card/95 p-2 shadow-xl shadow-foreground/5 backdrop-blur-xl">
          <HistoryControls editor={editor} />
          <Button
            className="hidden rounded-full xl:inline-flex"
            disabled
            size="sm"
            variant="ghost"
          >
            <HugeiconsIcon
              data-icon="inline-start"
              icon={ViewIcon}
              strokeWidth={1.8}
            />
            预览
          </Button>
          <Button className="rounded-full" disabled size="sm">
            导出
          </Button>
        </div>
      </div>

      <main className="col-start-1 row-start-2 min-h-0 min-w-0">
        <InfiniteCanvas onMount={handleMount} />
      </main>

      <ImageEditorLayers editor={editor} onAddImages={openFileDialog} />
      <ImageEditorDock
        editor={editor}
        isImporting={isImporting}
        onAddImages={openFileDialog}
      />
    </section>
  )
}
