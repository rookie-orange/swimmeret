import type { TLEditorSnapshot } from 'tldraw'

export interface ProjectSummary {
  id: string
  name: string
  trashed: boolean
  updatedAt: number
}

export interface ProjectFile extends ProjectSummary {
  schemaVersion: 1
  revision: number
  snapshot: TLEditorSnapshot | null
}

export type AssetVariant = 'original' | 'preview'

export interface ProjectRepository {
  list(): Promise<ProjectSummary[]>
  create(
    project: Pick<ProjectSummary, 'id' | 'name' | 'trashed'>,
  ): Promise<ProjectFile>
  load(id: string): Promise<ProjectFile>
  save(
    id: string,
    snapshot: TLEditorSnapshot,
    expectedRevision: number,
  ): Promise<ProjectFile>
  setTrashed(id: string, trashed: boolean): Promise<void>
  delete(id: string): Promise<void>
}

export interface AssetRepository {
  discard(projectId: string, key: string): Promise<void>
  put(
    projectId: string,
    key: string,
    variant: AssetVariant,
    blob: Blob,
  ): Promise<void>
  get(projectId: string, key: string, variant: AssetVariant): Promise<Blob>
}

export interface WorkspaceRepository {
  projects: ProjectRepository
  assets: AssetRepository
}

export function storageError(error: unknown) {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return '无法读写项目文件，请检查磁盘空间和访问权限'
}

export function validateStorageId(id: string) {
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id))
    throw new Error('无效的项目或素材标识')
}

export function assetStorageKey(src: string) {
  const url = new URL(src)
  if (url.protocol !== 'asset:') throw new Error('素材尚未保存到当前项目')
  const key = url.pathname
  validateStorageId(key)
  return key
}

export function parseProject(value: unknown): ProjectFile {
  if (!value || typeof value !== 'object') throw new Error('项目文件已损坏')
  const project = value as ProjectFile
  if (project.schemaVersion !== 1) throw new Error('项目文件版本不受支持')
  if (
    typeof project.id !== 'string' ||
    typeof project.name !== 'string' ||
    typeof project.trashed !== 'boolean' ||
    typeof project.updatedAt !== 'number' ||
    !Number.isSafeInteger(project.revision) ||
    project.revision < 0 ||
    (project.snapshot !== null &&
      (!project.snapshot?.document || !project.snapshot?.session))
  )
    throw new Error('项目文件已损坏')
  validateStorageId(project.id)
  return project
}
