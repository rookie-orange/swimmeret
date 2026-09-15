import { useCallback, useEffect, useRef, useState } from 'react'
import { useBlocker } from '@tanstack/react-router'
import { invoke, isTauri } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { getUserPreferences, type Editor, type TLAsset } from 'tldraw'

import {
  bindProjectAssets,
  createStoredImage,
  ProjectAssetStore,
} from '@/lib/local-asset-store'
import {
  ProjectAutosave,
  type SaveStatus,
} from '@/lib/project-storage/autosave'
import {
  migrateLegacyProjects,
  workspaceRepository,
} from '@/lib/project-storage/repository'
import { storageError, type ProjectFile } from '@/lib/project-storage/types'
import { writeProjectPreview } from '@/lib/project-preview'

interface LoadedProject {
  project: ProjectFile
  assets: ProjectAssetStore
}

function isPersistedRecord(record: { typeName: string }) {
  return (
    record.typeName !== 'pointer' && record.typeName !== 'instance_presence'
  )
}

export function useProjectSession(
  projectId: string,
  busyRef: { current: boolean },
) {
  const [loaded, setLoaded] = useState<LoadedProject | null>(null)
  const [editor, setEditor] = useState<Editor | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const [attempt, setAttempt] = useState(0)
  const autosave = useRef<ProjectAutosave | null>(null)
  const editorRef = useRef<Editor | null>(null)
  const previewWrite = useRef<Promise<void>>(Promise.resolve())
  const previewDirty = useRef(false)
  const previewVersion = useRef(0)
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const previewIdle = useRef<number | null>(null)
  const previewIdleFallback = useRef(false)

  const refreshPreview = useCallback(() => {
    const mounted = editorRef.current
    if (!mounted) return Promise.resolve()
    const version = previewVersion.current
    const nextWrite = previewWrite.current
      .catch(() => {})
      .then(() => {
        if (editorRef.current !== mounted) return
        return writeProjectPreview(
          mounted,
          projectId,
          workspaceRepository.assets,
        ).then(() => {
          if (
            editorRef.current === mounted &&
            previewVersion.current === version
          )
            previewDirty.current = false
        })
      })
    previewWrite.current = nextWrite
    return nextWrite
  }, [projectId])

  const schedulePreviewRefresh = useCallback(
    (delay = 750) => {
      if (previewTimer.current) clearTimeout(previewTimer.current)
      previewTimer.current = setTimeout(() => {
        previewTimer.current = null
        const run = () => {
          previewIdle.current = null
          void refreshPreview().catch(() => {})
        }
        if (typeof requestIdleCallback === 'function') {
          previewIdleFallback.current = false
          previewIdle.current = requestIdleCallback(run, { timeout: delay })
        } else {
          previewIdleFallback.current = true
          previewIdle.current = window.setTimeout(run, 0)
        }
      }, delay)
    },
    [refreshPreview],
  )
  const cancelScheduledPreview = useCallback(() => {
    if (previewTimer.current) {
      clearTimeout(previewTimer.current)
      previewTimer.current = null
    }
    if (previewIdle.current !== null) {
      if (previewIdleFallback.current) clearTimeout(previewIdle.current)
      else if (typeof cancelIdleCallback === 'function')
        cancelIdleCallback(previewIdle.current)
      previewIdle.current = null
      previewIdleFallback.current = false
    }
  }, [])

  useEffect(() => {
    let active = true
    const assets = new ProjectAssetStore(projectId, workspaceRepository.assets)
    void (async () => {
      try {
        await migrateLegacyProjects()
        const project = await workspaceRepository.projects.load(projectId)
        if (project.trashed) throw new Error('项目已移入回收站，请先恢复项目')
        if (project.snapshot) {
          const records = Object.values(project.snapshot.document.store)
          await assets.preload(
            records.filter(
              (record): record is TLAsset => record.typeName === 'asset',
            ),
          )
        }
        if (active) {
          setLoaded({ project, assets })
          setLoadError(null)
        }
      } catch (error) {
        if (active) setLoadError(storageError(error))
      }
    })()
    return () => {
      active = false
      assets.dispose()
    }
  }, [projectId, attempt])

  const onMount = useCallback(
    (mounted: Editor) => {
      if (!loaded) return
      let active = true
      bindProjectAssets(mounted, loaded.assets)
      try {
        if (loaded.project.snapshot)
          mounted.loadSnapshot(loaded.project.snapshot, {
            forceOverwriteSessionState: true,
          })
        else mounted.centerOnPoint({ x: 0, y: 0 })
        // Interrupted AI jobs cannot resume; retain the saved duplicate as a normal image.
        for (const shape of mounted.getCurrentPageShapes()) {
          if (shape.meta.decompositionPending === true)
            mounted.updateShape({
              id: shape.id,
              type: shape.type,
              meta: { ...shape.meta, decompositionPending: false },
            })
        }
        if (getUserPreferences().isSnapMode == null)
          mounted.user.updateUserPreferences({ isSnapMode: true })
      } catch (error) {
        setLoadError(storageError(error))
        return
      }
      mounted.registerExternalAssetHandler('file', ({ file, assetId }) =>
        createStoredImage(loaded.assets, file, assetId),
      )
      const saver = new ProjectAutosave(
        loaded.project,
        workspaceRepository.projects,
        () => mounted.getSnapshot(),
        () => loaded.assets.settled(),
        (status, error) => {
          if (!active) return
          setSaveStatus(status)
          setSaveError(error ? storageError(error) : null)
        },
      )
      autosave.current = saver
      const unlisten = mounted.store.listen(
        (entry) => {
          const hasPersistedChange =
            Object.values(entry.changes.added).some(isPersistedRecord) ||
            Object.values(entry.changes.removed).some(isPersistedRecord) ||
            Object.values(entry.changes.updated).some(([, record]) =>
              isPersistedRecord(record),
            )
          if (hasPersistedChange) {
            previewDirty.current = true
            previewVersion.current += 1
            saver.schedule()
            schedulePreviewRefresh(1000)
          }
        },
        { scope: 'all' },
      )
      editorRef.current = mounted
      previewDirty.current = true
      previewVersion.current += 1
      setEditor(mounted)
      // Exporting the preview is CPU-heavy; let the editor's first transition
      // finish before doing the initial export.
      schedulePreviewRefresh()
      return () => {
        active = false
        unlisten()
        saver.dispose()
        cancelScheduledPreview()
        if (editorRef.current === mounted) editorRef.current = null
        if (autosave.current === saver) autosave.current = null
      }
    },
    [cancelScheduledPreview, loaded, schedulePreviewRefresh],
  )

  const flush = useCallback(
    async ({ waitForPreview = true }: { waitForPreview?: boolean } = {}) => {
      if (busyRef.current) {
        setSaveError('图片任务尚未完成，请稍后再离开')
        return false
      }
      cancelScheduledPreview()
      try {
        await autosave.current?.flush()
      } catch {
        return false
      }
      if (waitForPreview && previewDirty.current) {
        try {
          await refreshPreview()
        } catch (error) {
          setSaveError(`项目已保存，但无法更新预览：${storageError(error)}`)
        }
      }
      return true
    },
    [busyRef, cancelScheduledPreview, refreshPreview],
  )

  useBlocker({
    // Preview export is supplementary to the project snapshot. Do not hold
    // up the route transition while rasterizing a PNG on the main thread.
    shouldBlockFn: async () => !(await flush({ waitForPreview: false })),
    enableBeforeUnload: () =>
      busyRef.current ||
      Boolean(loaded?.assets.hasPending || autosave.current?.hasChanges()),
  })

  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState === 'hidden') void flush().catch(() => {})
    }
    document.addEventListener('visibilitychange', onHidden)
    if (!isTauri())
      return () => document.removeEventListener('visibilitychange', onHidden)
    let active = true
    const owner = crypto.randomUUID()
    const window = getCurrentWindow()
    const unlisten = window.onCloseRequested((event) => {
      event.preventDefault()
      void flush()
        .then((saved) => {
          if (saved && active) return window.destroy()
        })
        .catch((error: unknown) => setSaveError(storageError(error)))
    })
    const unlistenExit = listen('canvas-exit-requested', () => {
      void flush()
        .then((saved) => {
          if (saved && active) return invoke('complete_canvas_exit')
        })
        .catch((error: unknown) => setSaveError(storageError(error)))
    }).then(async (dispose) => {
      if (active)
        await invoke('set_canvas_exit_guard', { enabled: true, owner })
      return dispose
    })
    void unlistenExit.catch((error: unknown) => {
      if (active) setSaveError(storageError(error))
    })
    void unlisten.catch((error: unknown) => {
      if (active) setSaveError(storageError(error))
    })
    return () => {
      active = false
      document.removeEventListener('visibilitychange', onHidden)
      void unlisten.then((dispose) => dispose()).catch(() => {})
      void unlistenExit
        .then(async (dispose) => {
          dispose()
          await invoke('set_canvas_exit_guard', { enabled: false, owner })
        })
        .catch(() => {})
    }
  }, [flush])

  return {
    loaded,
    editor,
    onMount,
    loadError,
    saveError,
    saveStatus,
    save: flush,
    retry: () => {
      setLoadError(null)
      setAttempt((value) => value + 1)
    },
  }
}
