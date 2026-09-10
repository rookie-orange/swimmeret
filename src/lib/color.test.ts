import assert from 'node:assert/strict'
import test from 'node:test'
import { hexToHsv, hsvToHex, normalizeColor } from './color.ts'

test('HEX and HSL input normalize without accepting invalid colors', () => {
  assert.equal(normalizeColor('#abc'), '#AABBCC')
  assert.equal(normalizeColor('hsl(120, 100%, 50%)'), '#00FF00')
  assert.equal(normalizeColor('hsl(-120, 100%, 50%)'), '#0000FF')
  assert.equal(normalizeColor('hsl(0, 101%, 50%)'), null)
  assert.equal(normalizeColor('#12'), null)
})
test('HSV area follows white, saturated color and black corners', () => {
  assert.equal(hsvToHex([0, 0, 100]), '#FFFFFF')
  assert.equal(hsvToHex([0, 100, 100]), '#FF0000')
  assert.equal(hsvToHex([0, 100, 0]), '#000000')
})
test('arbitrary HEX input retains exact RGB channels after conversion', () => {
  for (const hex of [
    '#123456',
    '#FE019A',
    '#010101',
    '#FFFFFF',
    '#888888',
    '#00FF00',
  ])
    assert.equal(hsvToHex(hexToHsv(hex)), hex)
})
