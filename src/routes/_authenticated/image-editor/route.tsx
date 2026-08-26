import { createFileRoute } from '@tanstack/react-router'

import { ImageEditorPage } from './-components/image-editor-page'

export const Route = createFileRoute('/_authenticated/image-editor')({
  component: ImageEditorPage,
})
