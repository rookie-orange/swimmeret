import { isTauri } from '@tauri-apps/api/core'

import { browserRepository } from './browser-repository'
import { tauriRepository } from './tauri-repository'
import { validateStorageId, type WorkspaceRepository } from './types'

export const workspaceRepository: WorkspaceRepository = isTauri()
  ? tauriRepository
  : browserRepository

let migration: Promise<void> | undefined

export function migrateLegacyProjects() {
  migration ??= (async () => {
    for (const [key, trashed] of [
      ['swimmeret-image-editor-projects', false],
      ['swimmeret-image-editor-trash', true],
    ] as const) {
      const stored = localStorage.getItem(key)
      if (!stored) continue
      const projects: unknown = JSON.parse(stored)
      if (!Array.isArray(projects))
        throw new Error('旧项目列表格式错误，未执行迁移')
      for (const project of projects) {
        if (
          !project ||
          typeof project.id !== 'string' ||
          typeof project.name !== 'string'
        )
          throw new Error('旧项目数据不完整，未执行迁移')
        validateStorageId(project.id)
        await workspaceRepository.projects.create({
          id: project.id,
          name: project.name,
          trashed,
        })
      }
      // Remove only after every entry is durably stored; retries are idempotent.
      localStorage.removeItem(key)
    }
  })().catch((error: unknown) => {
    migration = undefined
    throw error
  })
  return migration
}
