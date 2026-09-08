import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Editor, TLShape } from 'tldraw'

import { writeProjectPreview } from './project-preview.ts'
import type { AssetRepository } from './project-storage/types.ts'

function repository(overrides: Partial<AssetRepository>): AssetRepository {
  return {
    discard: async () => {},
    get: async () => new Blob(),
    put: async () => {},
    ...overrides,
  }
}

test('empty projects remove stale previews without exporting', async () => {
  const discarded: string[] = []
  const editor = {
    getCurrentPageShapes: () => [],
    toImage: () => assert.fail('empty projects must not be exported'),
  } as unknown as Editor

  await writeProjectPreview(
    editor,
    'project-one',
    repository({
      discard: async (_projectId, key) => {
        discarded.push(key)
      },
    }),
  )

  assert.deepEqual(discarded, ['__project-preview'])
})

test('large projects export a bounded composite preview', async () => {
  const preview = new Blob(['preview'], { type: 'image/png' })
  const shapes = [{} as TLShape]
  let scale = 0
  let stored: Blob | undefined
  const editor = {
    getCurrentPageBounds: () => ({ h: 1000, w: 4000 }),
    getCurrentPageShapes: () => shapes,
    toImage: async (exportedShapes: TLShape[], options: { scale: number }) => {
      assert.equal(exportedShapes, shapes)
      scale = options.scale
      return { blob: preview, height: 240, width: 960 }
    },
  } as unknown as Editor

  await writeProjectPreview(
    editor,
    'project-one',
    repository({
      put: async (_projectId, _key, _variant, blob) => {
        stored = blob
      },
    }),
  )

  assert.equal(scale, 0.24)
  assert.equal(stored, preview)
})
