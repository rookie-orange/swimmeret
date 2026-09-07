import { createFileRoute } from '@tanstack/react-router'

import { ImageEditorPage } from '@/routes/_authenticated/image-editor/-components/image-editor-page'

export const Route = createFileRoute('/(canvas)/image-editor/$id')({
  component: CanvasProjectRoute,
})

function CanvasProjectRoute() {
  const { id } = Route.useParams()
  return <ImageEditorPage key={id} projectId={id} />
}
