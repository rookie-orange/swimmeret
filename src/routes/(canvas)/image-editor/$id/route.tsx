import { createFileRoute } from '@tanstack/react-router'

import { ImageEditorPage } from '@/routes/_authenticated/image-editor/-components/image-editor-page'

export const Route = createFileRoute('/(canvas)/image-editor/$id')({
  component: ImageEditorPage,
})
