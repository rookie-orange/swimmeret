import { createContext, useContext } from 'react'
import type { TLShapeId } from 'tldraw'

export const ImageGenerationContext = createContext<{
  pendingIds: readonly TLShapeId[]
  generate: (shapeId: TLShapeId) => Promise<boolean>
}>({ pendingIds: [], generate: async () => false })

export function useImageGenerationContext() {
  return useContext(ImageGenerationContext)
}
