import { createFileRoute } from '@tanstack/react-router'

import { ImageEditorPage } from './-components/image-editor-page'

export const Route = createFileRoute('/image-editor/$id')({
  component: CanvasProjectRoute,
})

function CanvasProjectRoute() {
  const { id } = Route.useParams()
  return <ImageEditorPage key={id} projectId={id} />
}
