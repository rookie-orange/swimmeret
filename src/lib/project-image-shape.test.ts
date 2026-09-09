import assert from 'node:assert/strict'
import test from 'node:test'

import { getImageAdjustmentClass } from './project-image-adjustments.ts'

test('default image adjustments use neutral classes', () => {
  assert.equal(
    getImageAdjustmentClass('brightness', 0),
    'project-image-brightness-2',
  )
  assert.equal(
    getImageAdjustmentClass('vignette', 0),
    'project-image-vignette-0',
  )
})

test('vignette levels map directly without the signed adjustment offset', () => {
  assert.equal(
    getImageAdjustmentClass('vignette', 1),
    'project-image-vignette-1',
  )
  assert.equal(
    getImageAdjustmentClass('vignette', 2),
    'project-image-vignette-2',
  )
})
