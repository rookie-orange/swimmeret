import type { TLEditorSnapshot } from 'tldraw'

import type { ProjectFile, ProjectRepository } from './types'

export type SaveStatus = 'saved' | 'pending' | 'saving' | 'error'

export class ProjectAutosave {
  private revision: number
  private saved: string
  private running: Promise<void> | null = null
  private timer: ReturnType<typeof setTimeout> | undefined
  private disposed = false

  constructor(
    private project: ProjectFile,
    private repository: ProjectRepository,
    private readSnapshot: () => TLEditorSnapshot,
    private waitForAssets: () => Promise<void>,
    private onStatus: (status: SaveStatus, error?: unknown) => void,
  ) {
    this.revision = project.revision
    this.saved = JSON.stringify(readSnapshot())
  }

  hasChanges() {
    if (this.disposed) return false
    return this.saved !== JSON.stringify(this.readSnapshot())
  }

  schedule() {
    if (this.disposed || !this.hasChanges()) return
    this.onStatus('pending')
    // Keep one timer so continuous edits still reach disk regularly.
    this.timer ??= setTimeout(() => {
      this.timer = undefined
      void this.flush().catch(() => {})
    }, 600)
  }

  async flush(): Promise<void> {
    if (this.disposed) return
    clearTimeout(this.timer)
    this.timer = undefined
    if (this.running) {
      await this.running
      if (this.hasChanges()) await this.flush()
      return
    }
    const task = async () => {
      await this.waitForAssets()
      while (!this.disposed && this.hasChanges()) {
        this.onStatus('saving')
        const snapshot = this.readSnapshot()
        const serialized = JSON.stringify(snapshot)
        const result = await this.repository.save(
          this.project.id,
          snapshot,
          this.revision,
        )
        this.revision = result.revision
        this.saved = serialized
      }
      if (!this.disposed) this.onStatus('saved')
    }
    this.running = task()
      .catch((error: unknown) => {
        this.onStatus('error', error)
        throw error
      })
      .finally(() => {
        this.running = null
      })
    await this.running
  }

  dispose() {
    this.disposed = true
    clearTimeout(this.timer)
  }
}
