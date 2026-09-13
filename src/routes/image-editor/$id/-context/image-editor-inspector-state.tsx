import { createContext, type ReactNode, useContext } from 'react'

export type ImageEditorInspectorTab = 'layers' | 'properties'

interface ImageEditorInspectorState {
  activeTab: ImageEditorInspectorTab
  setActiveTab: (tab: ImageEditorInspectorTab) => void
}

const ImageEditorInspectorContext =
  createContext<ImageEditorInspectorState | null>(null)

export function ImageEditorInspectorProvider({
  children,
  value,
}: {
  children: ReactNode
  value: ImageEditorInspectorState
}) {
  return (
    <ImageEditorInspectorContext.Provider value={value}>
      {children}
    </ImageEditorInspectorContext.Provider>
  )
}

export function useImageEditorInspector() {
  const context = useContext(ImageEditorInspectorContext)
  if (!context) {
    throw new Error(
      'useImageEditorInspector must be used within ImageEditorInspectorProvider',
    )
  }
  return context
}
