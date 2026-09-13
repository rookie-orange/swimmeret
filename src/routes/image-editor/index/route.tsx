import { createFileRoute } from '@tanstack/react-router'

import { AppShell } from '@/components/app-shell'

import { ImageEditorProjectsPage } from './-components/image-editor-projects'

export const Route = createFileRoute('/image-editor/')({
  component: ImageEditorProjectsRoute,
})

function ImageEditorProjectsRoute() {
  return (
    <AppShell>
      <ImageEditorProjectsPage />
    </AppShell>
  )
}
