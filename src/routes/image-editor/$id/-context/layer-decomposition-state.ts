import { createContext, useContext } from 'react'
import type { TLShapeId } from 'tldraw'

export interface LayerDecompositionContextValue {
  isOpen: boolean
  isPending: boolean
  openForShape: (shapeId: TLShapeId) => void
}

export const LayerDecompositionContext =
  createContext<LayerDecompositionContextValue | null>(null)

export function useLayerDecompositionContext() {
  const context = useContext(LayerDecompositionContext)
  if (!context) {
    throw new Error('LayerDecompositionProvider is missing')
  }

  return context
}
