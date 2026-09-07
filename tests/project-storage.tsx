import { createRoot } from 'react-dom/client'
import {
  Tldraw,
  createShapeId,
  type Editor,
  type TLAsset,
  type TLEditorSnapshot,
} from 'tldraw'
import 'tldraw/tldraw.css'

import {
  createStoredImage,
  ProjectAssetStore,
} from '../src/lib/local-asset-store'
import { browserRepository } from '../src/lib/project-storage/browser-repository'
import { assetStorageKey } from '../src/lib/project-storage/types'
import { projectShapeUtils } from '../src/lib/project-image-shape'

const results = document.getElementById('results')!
const container = document.getElementById('canvas')!
const messages: string[] = []
function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
  messages.push(`PASS ${message}`)
  results.textContent = messages.join('\n')
}
async function hash(blob: Blob) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', await blob.arrayBuffer()),
    ),
  ).join(',')
}

const projectId = `test-${crypto.randomUUID()}`
const secondId = `test-${crypto.randomUUID()}`
let root: ReturnType<typeof createRoot> | undefined
let assets: ProjectAssetStore | undefined

async function mount(store: ProjectAssetStore, snapshot?: TLEditorSnapshot) {
  root = createRoot(container)
  return new Promise<Editor>((resolve) => {
    root!.render(
      <Tldraw
        shapeUtils={projectShapeUtils}
        hideUi
        assets={store.store}
        onMount={(editor) => {
          if (snapshot)
            editor.loadSnapshot(snapshot, { forceOverwriteSessionState: true })
          resolve(editor)
        }}
      />,
    )
  })
}

try {
  const repo = browserRepository
  await repo.projects.create({
    id: projectId,
    name: 'p0-integration',
    trashed: false,
  })
  await repo.projects.create({
    id: secondId,
    name: 'p0-isolation',
    trashed: false,
  })
  const canvas = document.createElement('canvas')
  canvas.width = 5000
  canvas.height = 1000
  const context = canvas.getContext('2d')!
  context.fillStyle = '#167c92'
  context.fillRect(0, 0, 5000, 1000)
  context.fillStyle = '#f54252'
  for (let x = 0; x < 5000; x += 2) context.fillRect(x, 0, 1, 1000)
  const original = await new Promise<Blob>((resolve) =>
    canvas.toBlob((blob) => resolve(blob!), 'image/png'),
  )
  let failedKey = ''
  const failingAssets = new ProjectAssetStore(projectId, {
    ...repo.assets,
    async put(id, key, variant, blob) {
      failedKey = key
      if (variant === 'preview') throw new Error('simulated disk full')
      await repo.assets.put(id, key, variant, blob)
    },
  })
  let failedWrite = false
  try {
    await failingAssets.put(original, original)
  } catch {
    failedWrite = true
  }
  let orphanExists = true
  try {
    await repo.assets.get(projectId, failedKey, 'original')
  } catch {
    orphanExists = false
  }
  check(
    failedWrite && !orphanExists,
    'partial asset write failure cleans up its unreferenced original',
  )
  failingAssets.dispose()
  assets = new ProjectAssetStore(projectId, repo.assets)
  const asset = await createStoredImage(
    assets,
    new File([original], 'original.png', { type: 'image/png' }),
  )
  check(
    asset.type === 'image' && asset.props.w === 5000 && asset.props.h === 1000,
    'asset metadata keeps original pixel dimensions',
  )
  check(
    asset.props.fileSize === original.size,
    'asset metadata keeps original byte size',
  )
  const key = assetStorageKey(asset.props.src!)
  check(
    (await hash(await repo.assets.get(projectId, key, 'original'))) ===
      (await hash(original)),
    'original bytes survive disk roundtrip unchanged',
  )
  const preview = await createImageBitmap(
    await repo.assets.get(projectId, key, 'preview'),
  )
  check(preview.width === 2048, 'preview is stored separately at 2048 pixels')
  preview.close()
  let editor = await mount(assets)
  const shapeId = createShapeId()
  editor.createAssets([asset])
  editor.createShapes([
    {
      id: shapeId,
      type: 'image',
      x: 10,
      y: 20,
      props: { assetId: asset.id, w: 250, h: 50 },
    },
  ])
  editor.setCamera({ x: 84, y: 126, z: 1.5 })
  const camera = { ...editor.getCamera() }
  const saved = await repo.projects.save(projectId, editor.getSnapshot(), 0)
  check(
    (await repo.projects.load(secondId)).snapshot === null,
    'project snapshots are isolated',
  )
  let conflict = false
  try {
    await repo.projects.save(projectId, editor.getSnapshot(), 0)
  } catch {
    conflict = true
  }
  check(
    conflict && (await repo.projects.load(projectId)).revision === 1,
    'stale writes cannot overwrite a newer revision',
  )
  root!.unmount()
  assets.dispose()
  assets = new ProjectAssetStore(projectId, repo.assets)
  const restored = await repo.projects.load(projectId)
  await assets.preload(
    Object.values(restored.snapshot!.document.store).filter(
      (record): record is TLAsset => record.typeName === 'asset',
    ),
  )
  editor = await mount(assets, restored.snapshot!)
  check(
    editor.getCurrentPageShapes().length === 1,
    'fresh editor restores image shapes',
  )
  const restoredCamera = editor.getCamera()
  check(
    restoredCamera.x === camera.x &&
      restoredCamera.y === camera.y &&
      restoredCamera.z === camera.z,
    'fresh editor restores pan and zoom',
  )
  const exported = await editor.toImage([shapeId], {
    format: 'png',
    padding: 0,
    pixelRatio: 1,
    scale: 20,
    background: false,
  })
  const bitmap = await createImageBitmap(exported.blob)
  check(
    bitmap.width === 5000 && bitmap.height === 1000,
    'canvas export can render original resolution',
  )
  const output = document.createElement('canvas')
  output.width = bitmap.width
  output.height = bitmap.height
  const outputContext = output.getContext('2d')!
  outputContext.drawImage(bitmap, 0, 0)
  const pixels = outputContext.getImageData(0, 100, 10, 1).data
  check(
    Math.abs(pixels[0] - pixels[4]) > 100,
    'export preserves one-pixel detail from original, not the downscaled preview',
  )
  bitmap.close()
  await repo.projects.setTrashed(projectId, true)
  let blocked = false
  try {
    await repo.projects.save(projectId, saved.snapshot!, 2)
  } catch {
    blocked = true
  }
  check(blocked, 'trashed project rejects stale autosaves')
  await repo.projects.setTrashed(projectId, false)
  check(
    (await hash(await repo.assets.get(projectId, key, 'original'))) ===
      (await hash(original)),
    'trash and restore retain original bytes',
  )
  const missing = structuredClone(editor.getSnapshot())
  const missingAsset = Object.values(missing.document.store).find(
    (record) => record.typeName === 'asset',
  )!
  if (missingAsset.typeName === 'asset')
    missingAsset.props.src = 'asset:missing'
  let incomplete = false
  try {
    await repo.projects.save(projectId, missing, 3)
  } catch {
    incomplete = true
  }
  check(
    incomplete && (await repo.projects.load(projectId)).revision === 3,
    'missing asset does not replace committed snapshot',
  )
  results.textContent += '\nALL TESTS PASSED'
} catch (error) {
  results.textContent += `\nFAIL ${error instanceof Error ? error.stack : String(error)}`
} finally {
  root?.unmount()
  assets?.dispose()
  for (const id of [projectId, secondId]) {
    try {
      await browserRepository.projects.setTrashed(id, true)
      await browserRepository.projects.delete(id)
    } catch {
      /* Only disposable test projects are cleaned up. */
    }
  }
}
