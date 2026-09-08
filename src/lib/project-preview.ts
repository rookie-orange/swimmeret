import type { Editor } from 'tldraw'

import type { AssetRepository } from './project-storage/types'

const PROJECT_PREVIEW_KEY = '__project-preview'
const PROJECT_PREVIEW_MAX_DIMENSION = 960

export async function writeProjectPreview(
  editor: Editor,
  projectId: string,
  repository: AssetRepository,
) {
  const shapes = editor.getCurrentPageShapes()
  if (shapes.length === 0) {
    await repository.discard(projectId, PROJECT_PREVIEW_KEY)
    return
  }

  const bounds = editor.getCurrentPageBounds()
  if (!bounds) return
  const longestSide = Math.max(bounds.w, bounds.h)
  const scale =
    longestSide > PROJECT_PREVIEW_MAX_DIMENSION
      ? PROJECT_PREVIEW_MAX_DIMENSION / longestSide
      : 1
  const { blob } = await editor.toImage(shapes, {
    background: true,
    format: 'png',
    padding: 'auto',
    pixelRatio: 1,
    scale,
  })
  await repository.put(projectId, PROJECT_PREVIEW_KEY, 'preview', blob)
}

export function readProjectPreview(
  projectId: string,
  repository: AssetRepository,
) {
  return repository.get(projectId, PROJECT_PREVIEW_KEY, 'preview')
}
