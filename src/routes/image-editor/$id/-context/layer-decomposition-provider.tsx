import type { ReactNode } from 'react'

import {
  LayerDecompositionContext,
  type LayerDecompositionContextValue,
} from './layer-decomposition-state'

export function LayerDecompositionProvider({
  children,
  value,
}: {
  children: ReactNode
  value: LayerDecompositionContextValue
}) {
  return (
    <LayerDecompositionContext value={value}>
      {children}
    </LayerDecompositionContext>
  )
}
