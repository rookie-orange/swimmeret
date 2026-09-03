import { createFileRoute } from '@tanstack/react-router'

import { ImageEditorProjectsPage } from './-components/image-editor-projects'

export const Route = createFileRoute('/_authenticated/image-editor')({
  component: ImageEditorProjectsPage,
})
