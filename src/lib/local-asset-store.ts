import {
  AssetRecordType,
  type Editor,
  type TLAsset,
  type TLAssetId,
  type TLAssetStore,
} from 'tldraw'

import type { AssetRepository, AssetVariant } from './project-storage/types'
import { assetStorageKey } from './project-storage/types'

const stores = new WeakMap<Editor, ProjectAssetStore>()

export function bindProjectAssets(editor: Editor, assets: ProjectAssetStore) {
  stores.set(editor, assets)
}

export function getProjectAssets(editor: Editor) {
  const assets = stores.get(editor)
  if (!assets) throw new Error('项目素材尚未就绪')
  return assets
}

export async function prepareImage(file: File) {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type))
    throw new Error('仅支持 PNG、JPEG、WebP 图片')
  if (file.size > 30 * 1024 * 1024) throw new Error('图片超过 30 MiB')
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    const width = image.naturalWidth
    const height = image.naturalHeight
    const scale = Math.min(1, 2048 / Math.max(width, height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(width * scale))
    canvas.height = Math.max(1, Math.round(height * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('无法生成图片预览')
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    const preview = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) =>
          blob ? resolve(blob) : reject(new Error('无法生成图片预览')),
        'image/png',
      )
    })
    return { width, height, preview }
  } finally {
    URL.revokeObjectURL(url)
  }
}

export class ProjectAssetStore {
  private urls = new Map<string, Promise<string>>()
  private pending = new Set<Promise<unknown>>()
  private disposed = false

  constructor(
    private projectId: string,
    private repository: AssetRepository,
  ) {}

  readonly store: TLAssetStore = {
    upload: async (_asset, file) => {
      const prepared = await this.import(file)
      return { src: prepared.src }
    },
    resolve: (asset, context) => {
      if (asset.type === 'bookmark') return asset.props.src
      if (!asset.props.src) return null
      return this.url(
        asset.props.src,
        context.shouldResolveToOriginal ? 'original' : 'preview',
        asset.props.mimeType ?? 'image/png',
      )
    },
    // Keep files for undo/redo and previous snapshots. Project deletion owns cleanup.
    remove: async () => {},
  }

  get hasPending() {
    return this.pending.size > 0
  }

  async import(file: File) {
    const task = (async () => {
      const { width, height, preview } = await prepareImage(file)
      return { width, height, src: await this.put(file, preview) }
    })()
    this.pending.add(task)
    try {
      return await task
    } finally {
      this.pending.delete(task)
    }
  }

  async put(original: Blob, preview: Blob) {
    const key = crypto.randomUUID()
    const task = (async () => {
      try {
        await this.repository.put(this.projectId, key, 'original', original)
        await this.repository.put(this.projectId, key, 'preview', preview)
      } catch (error) {
        await this.repository.discard(this.projectId, key).catch(() => {})
        throw error
      }
      return `asset:${key}`
    })()
    this.pending.add(task)
    try {
      return await task
    } finally {
      this.pending.delete(task)
    }
  }

  async settled() {
    while (this.pending.size) await Promise.all(this.pending)
  }

  private url(key: string, variant: AssetVariant, mimeType: string) {
    key = assetStorageKey(key)
    const cacheKey = `${key}/${variant}`
    let task = this.urls.get(cacheKey)
    if (!task) {
      task = this.repository
        .get(this.projectId, key, variant)
        .then((blob) => {
          if (this.disposed) throw new Error('画布已关闭')
          return URL.createObjectURL(
            new Blob([blob], {
              type: variant === 'preview' ? 'image/png' : mimeType,
            }),
          )
        })
        .catch((error: unknown) => {
          this.urls.delete(cacheKey)
          throw error
        })
      this.urls.set(cacheKey, task)
    }
    return task
  }

  async preload(assets: TLAsset[]) {
    for (const asset of assets) {
      if (asset.type === 'bookmark') continue
      if (!asset.props.src) throw new Error('项目包含未保存的素材')
      await this.url(
        asset.props.src,
        'preview',
        asset.props.mimeType ?? 'image/png',
      )
    }
  }

  dispose() {
    this.disposed = true
    for (const url of this.urls.values())
      void url.then(URL.revokeObjectURL).catch(() => {})
    this.urls.clear()
  }
}

export async function createStoredImage(
  assets: ProjectAssetStore,
  file: File,
  id?: TLAssetId,
) {
  const { width, height, src } = await assets.import(file)
  return AssetRecordType.create({
    ...(id ? { id } : {}),
    type: 'image',
    props: {
      name: file.name,
      src,
      w: width,
      h: height,
      mimeType: file.type,
      fileSize: file.size,
      isAnimated: false,
    },
    meta: {},
  })
}
