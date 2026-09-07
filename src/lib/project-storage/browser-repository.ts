import {
  parseProject,
  assetStorageKey,
  validateStorageId,
  type ProjectFile,
  type WorkspaceRepository,
} from './types'

async function root() {
  if (!navigator.storage?.getDirectory || !navigator.locks) {
    throw new Error('当前浏览器不支持本地项目文件，请使用桌面客户端')
  }
  return (await navigator.storage.getDirectory()).getDirectoryHandle(
    'swimmeret-projects',
    { create: true },
  )
}

async function directory(id: string, create = false) {
  validateStorageId(id)
  return (await root()).getDirectoryHandle(id, { create })
}

async function load(id: string) {
  const handle = await (await directory(id)).getFileHandle('project.json')
  const project = parseProject(
    JSON.parse(await (await handle.getFile()).text()),
  )
  if (project.id !== id) throw new Error('项目文件标识不匹配')
  return project
}

async function writeFile(
  dir: FileSystemDirectoryHandle,
  name: string,
  data: Blob | string,
) {
  const stream = await (
    await dir.getFileHandle(name, { create: true })
  ).createWritable()
  try {
    await stream.write(data)
    // OPFS writable streams commit their temporary file on close.
    await stream.close()
  } catch (error) {
    await stream.abort().catch(() => {})
    throw error
  }
}

async function write(project: ProjectFile) {
  await writeFile(
    await directory(project.id),
    'project.json',
    JSON.stringify(project),
  )
}

function locked<T>(action: () => Promise<T>) {
  return navigator.locks.request('swimmeret-project-storage', action)
}

export const browserRepository: WorkspaceRepository = {
  projects: {
    async list() {
      const entries: ProjectFile[] = []
      const dir = await root()
      // TypeScript's DOM declarations do not yet include OPFS async iteration.
      for await (const [id, entry] of (
        dir as FileSystemDirectoryHandle & {
          entries(): AsyncIterableIterator<[string, FileSystemHandle]>
        }
      ).entries()) {
        if (entry.kind !== 'directory') continue
        try {
          entries.push(await load(id))
        } catch (error) {
          if (
            !(error instanceof DOMException && error.name === 'NotFoundError')
          )
            throw error
        }
      }
      return entries.map(({ id, name, trashed, updatedAt }) => ({
        id,
        name,
        trashed,
        updatedAt,
      }))
    },
    create: (input) =>
      locked(async () => {
        const dir = await directory(input.id, true)
        try {
          return await load(input.id)
        } catch (error) {
          if (
            !(error instanceof DOMException && error.name === 'NotFoundError')
          )
            throw error
        }
        const project: ProjectFile = {
          ...input,
          schemaVersion: 1,
          revision: 0,
          updatedAt: Date.now(),
          snapshot: null,
        }
        await writeFile(dir, 'project.json', JSON.stringify(project))
        return project
      }),
    load,
    save: (id, snapshot, expectedRevision) =>
      locked(async () => {
        const project = await load(id)
        if (project.trashed) throw new Error('项目已移入回收站，无法保存')
        if (project.revision !== expectedRevision)
          throw new Error(
            '项目已在其他窗口更新，请保留当前页面并重新打开项目核对',
          )
        for (const record of Object.values(snapshot.document.store)) {
          if (record.typeName !== 'asset' || record.type === 'bookmark')
            continue
          if (!record.props.src) throw new Error('素材尚未保存，请稍后重试')
          const key = assetStorageKey(record.props.src)
          await browserRepository.assets.get(id, key, 'original')
          await browserRepository.assets.get(id, key, 'preview')
        }
        const next = {
          ...project,
          snapshot,
          revision: project.revision + 1,
          updatedAt: Date.now(),
        }
        await write(next)
        return next
      }),
    setTrashed: (id, trashed) =>
      locked(async () => {
        const project = await load(id)
        await write({ ...project, trashed, revision: project.revision + 1 })
      }),
    delete: (id) =>
      locked(async () => {
        const project = await load(id)
        if (!project.trashed) throw new Error('只能永久删除回收站中的项目')
        await (await root()).removeEntry(id, { recursive: true })
      }),
  },
  assets: {
    discard: (id, key) =>
      locked(async () => {
        validateStorageId(key)
        const project = await load(id)
        if (
          Object.values(project.snapshot?.document.store ?? {}).some(
            (record) =>
              record.typeName === 'asset' &&
              record.props.src === `asset:${key}`,
          )
        )
          throw new Error('素材仍被已保存的项目引用')
        let assets: FileSystemDirectoryHandle
        try {
          assets = await (await directory(id)).getDirectoryHandle('assets')
        } catch (error) {
          if (error instanceof DOMException && error.name === 'NotFoundError')
            return
          throw error
        }
        for (const variant of ['original', 'preview']) {
          await assets
            .removeEntry(`${key}-${variant}`)
            .catch((error: unknown) => {
              if (
                !(
                  error instanceof DOMException &&
                  error.name === 'NotFoundError'
                )
              )
                throw error
            })
        }
      }),
    put: (id, key, variant, blob) =>
      locked(async () => {
        validateStorageId(key)
        const project = await load(id)
        if (project.trashed) throw new Error('项目已移入回收站')
        const assets = await (
          await directory(id)
        ).getDirectoryHandle('assets', { create: true })
        await writeFile(assets, `${key}-${variant}`, blob)
      }),
    async get(id, key, variant) {
      validateStorageId(key)
      const assets = await (await directory(id)).getDirectoryHandle('assets')
      return (await assets.getFileHandle(`${key}-${variant}`)).getFile()
    },
  },
}
