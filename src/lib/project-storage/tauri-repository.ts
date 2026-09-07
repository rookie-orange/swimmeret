import { invoke } from '@tauri-apps/api/core'

import { parseProject, type WorkspaceRepository } from './types'

export const tauriRepository: WorkspaceRepository = {
  projects: {
    list: () => invoke('list_canvas_projects'),
    create: async (project) =>
      parseProject(await invoke('create_canvas_project', { project })),
    load: async (id) =>
      parseProject(await invoke('load_canvas_project', { id })),
    save: async (id, snapshot, expectedRevision) =>
      parseProject(
        await invoke('save_canvas_project', { id, snapshot, expectedRevision }),
      ),
    setTrashed: (id, trashed) =>
      invoke('trash_canvas_project', { id, trashed }),
    delete: (id) => invoke('delete_canvas_project', { id }),
  },
  assets: {
    discard: (projectId, key) =>
      invoke('discard_canvas_asset', { projectId, key }),
    async put(projectId, key, variant, blob) {
      await invoke(
        'write_canvas_asset',
        new Uint8Array(await blob.arrayBuffer()),
        {
          headers: {
            'x-project-id': projectId,
            'x-asset-key': key,
            'x-asset-variant': variant,
          },
        },
      )
    },
    async get(projectId, key, variant) {
      const bytes = await invoke<ArrayBuffer | number[]>('read_canvas_asset', {
        projectId,
        key,
        variant,
      })
      return new Blob([
        bytes instanceof ArrayBuffer ? bytes : new Uint8Array(bytes),
      ])
    },
  },
}
