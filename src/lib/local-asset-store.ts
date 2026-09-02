import type { TLAsset, TLAssetId, TLAssetStore } from 'tldraw'

const localAssetUrls = new Map<TLAssetId, string>()

export function registerLocalAsset(assetId: TLAssetId, file: File) {
  releaseLocalAsset(assetId)
  const url = URL.createObjectURL(file)
  localAssetUrls.set(assetId, url)
  return url
}

export function releaseLocalAsset(assetId: TLAssetId) {
  const url = localAssetUrls.get(assetId)
  if (!url) return
  URL.revokeObjectURL(url)
  localAssetUrls.delete(assetId)
}

export const localAssetStore: TLAssetStore = {
  async upload(asset, file) {
    registerLocalAsset(asset.id, file)
    return { src: asset.id }
  },
  resolve(asset: TLAsset) {
    return localAssetUrls.get(asset.id) ?? null
  },
  async remove(assetIds) {
    for (const assetId of assetIds) releaseLocalAsset(assetId)
  },
}
