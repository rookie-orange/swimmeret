import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { clearMocks, mockIPC } from '@tauri-apps/api/mocks'
import { Tldraw, createPageId, type Editor, type TLImageShape } from 'tldraw'
import 'tldraw/tldraw.css'
import '../src/index.css'

import { TooltipProvider } from '../src/components/ui/tooltip'
import {
  bindProjectAssets,
  ProjectAssetStore,
} from '../src/lib/local-asset-store'
import { browserRepository } from '../src/lib/project-storage/browser-repository'
import { assetStorageKey } from '../src/lib/project-storage/types'
import { projectShapeUtils } from '../src/lib/project-image-shape'
import { ImageEditorDock } from '../src/routes/_authenticated/image-editor/-components/image-editor-dock'
import { useImageGeneration } from '../src/routes/_authenticated/image-editor/-components/use-image-generation'

const logs: string[] = []
const results = document.getElementById('results')!
const check = (ok: unknown, message: string) => {
  if (!ok) throw new Error(message)
  logs.push(`PASS ${message}`)
  results.textContent = logs.join('\n')
}
async function until(condition: () => boolean, message: string) {
  const deadline = Date.now() + 8000
  while (!condition()) {
    if (Date.now() > deadline) throw new Error(`Timed out: ${message}`)
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
}
const projectId = `test-generation-${crypto.randomUUID()}`
let failWrites = false
let writes = 0
const assets = new ProjectAssetStore(projectId, {
  ...browserRepository.assets,
  async put(...args) {
    if (failWrites) throw new Error('simulated disk full')
    writes += 1
    await browserRepository.assets.put(...args)
  },
})
let editor: Editor
let generation: ReturnType<typeof useImageGeneration>
function Harness() {
  const [mounted, setMounted] = useState<Editor | null>(null)
  const state = useImageGeneration(mounted)
  useEffect(() => {
    generation = state
  }, [state])
  return (
    <TooltipProvider>
      <div className="relative h-160 bg-background text-foreground">
        <Tldraw
          hideUi
          shapeUtils={projectShapeUtils}
          assets={assets.store}
          onMount={(value) => {
            editor = value
            bindProjectAssets(value, assets)
            setMounted(value)
          }}
        />
        <ImageEditorDock
          editor={mounted}
          isImporting={false}
          onAddImages={() => {}}
          onGenerateImage={state.generate}
          isGeneratingImage={state.isGenerating}
        />
        {state.error && (
          <p role="alert" className="absolute top-4 left-4 text-destructive">
            {state.error}
          </p>
        )}
      </div>
    </TooltipProvider>
  )
}
let count = 0
let payload: unknown
let resolveResponse: (value: unknown) => void
let rejectResponse: (error: unknown) => void
mockIPC((command, args) => {
  if (command !== 'generate_image')
    throw new Error(`Unexpected command ${command}`)
  count += 1
  payload = args
  return new Promise((resolve, reject) => {
    resolveResponse = resolve
    rejectResponse = reject
  })
})
Object.assign(globalThis, { isTauri: true })
const root = createRoot(document.getElementById('root')!)
const unhandled: unknown[] = []
const onUnhandled = (event: PromiseRejectionEvent) =>
  unhandled.push(event.reason)
window.addEventListener('unhandledrejection', onUnhandled)
try {
  await browserRepository.projects.create({
    id: projectId,
    name: 'generation-test',
    trashed: false,
  })
  const fixture = document.createElement('canvas')
  fixture.width = 320
  fixture.height = 180
  fixture.getContext('2d')!.fillRect(0, 0, 320, 180)
  const original = await new Promise<Blob>((resolve) =>
    fixture.toBlob((blob) => resolve(blob!), 'image/png'),
  )
  const png = await original.arrayBuffer()
  root.render(<Harness />)
  await until(() => Boolean(editor && generation), 'editor ready')
  document.querySelector<HTMLButtonElement>('[aria-label="AI 生图"]')!.click()
  await until(
    () => Boolean(document.querySelector('input[aria-label="图片描述"]')),
    'AI input opens',
  )
  const input = document.querySelector<HTMLInputElement>(
    'input[aria-label="图片描述"]',
  )!
  const form = input.closest('form')!
  const send = document.querySelector<HTMLButtonElement>(
    '[aria-label="生成图片"]',
  )!
  check(send.disabled, 'empty prompt cannot be submitted')
  form.requestSubmit()
  check(count === 0, 'empty form does not invoke Ark')
  Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value',
  )!.set!.call(input, '  山间的小屋  ')
  input.dispatchEvent(new Event('input', { bubbles: true }))
  await until(() => !send.disabled, 'draft entered')
  const composition = new KeyboardEvent('keydown', {
    key: 'Enter',
    isComposing: true,
    bubbles: true,
    cancelable: true,
  })
  input.dispatchEvent(composition)
  check(
    composition.defaultPrevented && count === 0,
    'IME confirmation does not submit',
  )
  form.requestSubmit()
  form.requestSubmit()
  await until(() => generation.isGenerating, 'request pending')
  check(
    count === 1 && input.disabled && send.disabled,
    'double submit starts only one request and disables controls',
  )
  check(
    JSON.stringify(payload) ===
      JSON.stringify({ request: { prompt: '山间的小屋', size: '2K' } }),
    'IPC sends trimmed prompt and 2K size',
  )
  rejectResponse!({ code: 'rate_limited', message: '请求过于频繁，请稍后重试' })
  await until(() => !generation.isGenerating, 'failure handled')
  check(
    generation.error === '请求过于频繁，请稍后重试' &&
      input.value.trim() === '山间的小屋',
    'failure is shown and prompt is retained for retry',
  )
  check(
    editor.getCurrentPageShapes().length === 0,
    'failed generation adds no shape',
  )
  form.requestSubmit()
  resolveResponse!(png)
  await until(
    () =>
      !generation.isGenerating && editor.getCurrentPageShapes().length === 1,
    'image inserted',
  )
  await until(() => input.value === '', 'successful prompt cleared')
  const shape = editor.getCurrentPageShapes()[0] as TLImageShape
  const asset = editor.getAsset(shape.props.assetId!)!
  check(
    asset.type === 'image' && asset.props.w === 320 && asset.props.h === 180,
    'generated dimensions are preserved',
  )
  check(
    editor.getSelectedShapeIds()[0] === shape.id &&
      shape.props.altText === '山间的小屋',
    'generated image selected with prompt description',
  )
  const stored = await browserRepository.assets.get(
    projectId,
    assetStorageKey(asset.props.src!),
    'original',
  )
  check(
    JSON.stringify(Array.from(new Uint8Array(await stored.arrayBuffer()))) ===
      JSON.stringify(Array.from(new Uint8Array(png))),
    'original PNG bytes saved without modification',
  )
  const preview = await createImageBitmap(
    await browserRepository.assets.get(
      projectId,
      assetStorageKey(asset.props.src!),
      'preview',
    ),
  )
  check(
    preview.width === 320 && preview.height === 180,
    'preview saved separately',
  )
  preview.close()
  editor.undo()
  check(!editor.getShape(shape.id), 'one undo removes the generated image')
  editor.redo()
  check(Boolean(editor.getShape(shape.id)), 'redo restores the image')
  await browserRepository.projects.save(projectId, editor.getSnapshot(), 0)
  const saved = await browserRepository.projects.load(projectId)
  editor.loadSnapshot(saved.snapshot!)
  check(
    Boolean(editor.getShape(shape.id)),
    'saved snapshot restores the generated image',
  )
  failWrites = true
  const failedStorage = generation.generate('another image')
  resolveResponse!(new Uint8Array(png))
  check(!(await failedStorage), 'disk failure rejects insertion')
  await until(() => !generation.isGenerating, 'storage failure handled')
  check(
    editor.getCurrentPageShapes().length === 1 &&
      generation.error === 'simulated disk full',
    'storage failure keeps canvas unchanged and reports error',
  )
  failWrites = false
  const empty = generation.generate('empty response')
  resolveResponse!([])
  check(!(await empty), 'empty binary response rejected')
  const pageId = editor.getCurrentPageId()
  const otherPage = createPageId()
  editor.createPage({ id: otherPage, name: 'Other page' })
  const stale = generation.generate('delayed image')
  editor.setCurrentPage(otherPage)
  const writesBeforeStale = writes
  resolveResponse!(png)
  check(
    !(await stale) &&
      editor.getCurrentPageShapes().length === 0 &&
      writes === writesBeforeStale,
    'page switch prevents stale insertion and storage writes',
  )
  editor.setCurrentPage(pageId)
  const requestsBeforeReadonly = count
  editor.updateInstanceState({ isReadonly: true })
  check(
    !(await generation.generate('readonly')) &&
      count === requestsBeforeReadonly,
    'readonly canvas rejected before paid request',
  )
  editor.updateInstanceState({ isReadonly: false })
  const detached = generation.generate('closed canvas')
  root.unmount()
  const writesBeforeUnmount = writes
  resolveResponse!(png)
  check(
    !(await detached) && writes === writesBeforeUnmount,
    'unmounted canvas ignores late result',
  )
  check(unhandled.length === 0, 'no unhandled promise rejections')
  logs.push('ALL TESTS PASSED')
} catch (error) {
  logs.push(`FAIL ${String(error)}`)
} finally {
  root.unmount()
  assets.dispose()
  clearMocks()
  Object.assign(globalThis, { isTauri: false })
  window.removeEventListener('unhandledrejection', onUnhandled)
  await browserRepository.projects.delete(projectId)
  results.textContent = logs.join('\n')
}
