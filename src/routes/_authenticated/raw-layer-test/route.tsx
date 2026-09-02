import { createFileRoute } from '@tanstack/react-router'

import { RawLayerTestPage } from '../-components/raw-layer-test-page'

export const Route = createFileRoute('/_authenticated/raw-layer-test')({
  component: RawLayerTestPage,
})
