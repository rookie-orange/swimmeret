import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { clearMocks, mockIPC } from '@tauri-apps/api/mocks'
import {
  Tldraw,
  PageRecordType,
  type Editor,
  type TLImageShape,
  type TLShapeId,
} from 'tldraw'
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
import { getImageGenerationDraft } from '../src/lib/project-image-generation'
import { ImageGenerationContext } from '../src/lib/image-generation-context'
import { ImageEditorDock } from '../src/routes/_authenticated/image-editor/-components/image-editor-dock'
import { ImageGenerationInput } from '../src/routes/_authenticated/image-editor/-components/image-generation-input'
import { useImageGeneration } from '../src/routes/_authenticated/image-editor/-components/use-image-generation'

const manual = new URLSearchParams(location.search).has('manual')
const reportTest = (message: string) => {
  void fetch('http://127.0.0.1:1425', { method: 'POST', body: message }).catch(
    () => {},
  )
}
window.addEventListener('error', (event) =>
  reportTest(`ERROR ${event.message}`),
)
window.addEventListener('unhandledrejection', (event) =>
  reportTest(`REJECTION ${String(event.reason)}`),
)
reportTest('TEST INITIALIZED')
const logs: string[] = []
const results = document.getElementById('results')!
const check = (ok: unknown, message: string) => {
  if (!ok) throw new Error(message)
  logs.push(`PASS ${message}`)
  reportTest(`PASS ${message}`)
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
let imports = 0
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
const components = { InFrontOfTheCanvas: ImageGenerationInput }
function Harness() {
  const [mounted, setMounted] = useState<Editor | null>(null)
  const state = useImageGeneration(mounted)
  useEffect(() => {
    generation = state
  }, [state])
  return (
    <TooltipProvider>
      <ImageGenerationContext value={state}>
        <div className="relative h-160 bg-background text-foreground">
          <Tldraw
            hideUi
            components={components}
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
            onAddImages={() => {
              imports += 1
            }}
            onAddGeneration={state.addPlaceholder}
          />
        </div>
      </ImageGenerationContext>
    </TooltipProvider>
  )
}
let count = 0
let payload: unknown
let resolveResponse: (value: unknown) => void
let rejectResponse: (error: unknown) => void
const fixture = document.createElement('canvas')
fixture.width = 320
fixture.height = 180
fixture.getContext('2d')!.fillRect(0, 0, 320, 180)
const png = await (
  await new Promise<Blob>((resolve) => fixture.toBlob((blob) => resolve(blob!)))
).arrayBuffer()
mockIPC((command, args) => {
  if (command !== 'generate_image')
    throw new Error(`Unexpected command ${command}`)
  count += 1
  payload = args
  return new Promise((resolve, reject) => {
    resolveResponse = resolve
    rejectResponse = reject
    if (manual) setTimeout(() => resolve(png), 4000)
  })
})
Object.assign(globalThis, { isTauri: true })
const root = createRoot(document.getElementById('root')!)
const unhandled: unknown[] = []
const onUnhandled = (event: PromiseRejectionEvent) =>
  unhandled.push(event.reason)
window.addEventListener('unhandledrejection', onUnhandled)
await browserRepository.projects.create({
  id: projectId,
  name: 'generation-test',
  trashed: false,
})
root.render(<Harness />)
await until(() => Boolean(editor && generation), 'editor mounted')
function newDraft(prompt = '山间的小屋') {
  const id = generation.addPlaceholder()!
  const shape = editor.getShape<TLImageShape>(id)!
  editor.updateShape({
    id,
    type: 'image',
    meta: {
      ...shape.meta,
      imageGeneration: { ...getImageGenerationDraft(shape)!, prompt },
    },
  })
  return id
}
function draft(id: TLShapeId) {
  return getImageGenerationDraft(editor.getShape(id))
}
if (manual) {
  results.textContent = '交互预览：使用模拟接口，4 秒后返回测试图片。'
} else
  try {
    document.querySelector<HTMLButtonElement>('[aria-label="添加"]')!.click()
    await until(
      () => !!document.querySelector('[role="menuitem"]'),
      'add menu opens',
    )
    const menuItems = [
      ...document.querySelectorAll<HTMLElement>('[role="menuitem"]'),
    ]
    check(
      menuItems.length === 2 &&
        menuItems[0].textContent?.includes('添加素材') &&
        menuItems[1].textContent?.includes('文生图'),
      'plus menu contains import and text-to-image',
    )
    menuItems[0].click()
    check(imports === 1, 'import item invokes existing import callback')
    const id = generation.addPlaceholder()!
    check(
      !!draft(id) && count === 0 && editor.getCurrentPageShapes().length === 1,
      'placeholder appears immediately without a paid request',
    )
    editor.select(id)
    await until(
      () => !!document.querySelector('textarea'),
      'select placeholder opens prompt',
    )
    let input = document.querySelector('textarea')!
    const form = input.closest('form')!
    check(
      document.querySelector<HTMLButtonElement>('[aria-label="生成图片"]')!
        .disabled,
      'empty prompt disables submit',
    )
    form.requestSubmit()
    check(count === 0, 'empty submit ignored')
    Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      'value',
    )!.set!.call(input, '  山间的小屋\n清晨的薄雾  ')
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await until(
      () => !!draft(id)?.prompt.includes('\n'),
      'multiline prompt saved on node',
    )
    input.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        ctrlKey: true,
        isComposing: true,
        bubbles: true,
        cancelable: true,
      }),
    )
    check(count === 0, 'IME enter never submits')
    const current = editor.getShape<TLImageShape>(id)!
    editor.updateShape({
      id,
      type: 'image',
      meta: {
        ...current.meta,
        imageGeneration: { ...draft(id)!, aspectRatio: '16:9', size: '1.5K' },
      },
    })
    const first = generation.generate(id)
    check(!(await generation.generate(id)), 'duplicate request ignored')
    await until(
      () => generation.isGenerating && !document.querySelector('textarea'),
      'pending node hides prompt',
    )
    await until(
      () => !!document.querySelector('[aria-label="正在生成图片"] canvas'),
      'Grainient renders inside pending node',
    )
    check(
      JSON.stringify(payload) ===
        JSON.stringify({
          request: {
            prompt: '山间的小屋\n清晨的薄雾',
            size: '1.5K',
            aspectRatio: '16:9',
          },
        }),
      'IPC carries prompt, resolution and ratio',
    )
    rejectResponse!({
      code: 'rate_limited',
      message: '请求过于频繁，请稍后重试',
    })
    check(!(await first), 'request failure reported')
    await until(
      () => !generation.isGenerating && !!document.querySelector('textarea'),
      'failed node becomes editable',
    )
    check(
      draft(id)?.error === '请求过于频繁，请稍后重试' &&
        draft(id)?.prompt.includes('薄雾'),
      'failure retains prompt and settings for retry',
    )
    const retry = generation.generate(id)
    editor.updateShape({ id, type: 'image', x: 120, y: 80, rotation: 0.3 })
    const before = editor.getShape<TLImageShape>(id)!
    resolveResponse!(png)
    check(await retry, 'retry succeeds')
    await until(
      () => !generation.isGenerating && !document.querySelector('textarea'),
      'completed image has no prompt',
    )
    const shape = editor.getShape<TLImageShape>(id)!
    const asset = editor.getAsset(shape.props.assetId!)!
    check(
      shape.x === before.x &&
        shape.y === before.y &&
        shape.rotation === before.rotation &&
        shape.index === before.index &&
        shape.parentId === before.parentId,
      'result replaces same node and preserves current transform and layer',
    )
    check(
      !draft(id) &&
        asset.type === 'image' &&
        asset.props.w === 320 &&
        asset.props.h === 180,
      'completed node is an ordinary image with original dimensions',
    )
    const stored = await browserRepository.assets.get(
      projectId,
      assetStorageKey(asset.props.src!),
      'original',
    )
    check(
      JSON.stringify(Array.from(new Uint8Array(await stored.arrayBuffer()))) ===
        JSON.stringify(Array.from(new Uint8Array(png))),
      'original PNG bytes saved unchanged',
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
    check(!!draft(id), 'undo restores editable placeholder')
    editor.redo()
    check(
      !draft(id) && !!editor.getShape<TLImageShape>(id)?.props.assetId,
      'redo restores generated image',
    )
    const savedDraft = newDraft('saved prompt')
    await browserRepository.projects.save(projectId, editor.getSnapshot(), 0)
    editor.loadSnapshot(
      (await browserRepository.projects.load(projectId)).snapshot!,
    )
    check(
      draft(savedDraft)?.prompt === 'saved prompt' && !draft(id),
      'snapshot restores drafts and ordinary generated images',
    )
    failWrites = true
    const failedStorage = generation.generate(savedDraft)
    resolveResponse!(new Uint8Array(png))
    check(
      !(await failedStorage) &&
        draft(savedDraft)?.error === 'simulated disk full',
      'disk failure retains retryable placeholder',
    )
    failWrites = false
    const empty = generation.generate(savedDraft)
    resolveResponse!([])
    check(
      !(await empty) && !!draft(savedDraft),
      'invalid image response keeps draft',
    )
    const pageId = editor.getCurrentPageId()
    const otherPage = PageRecordType.createId()
    editor.createPage({ id: otherPage, name: 'Other page' })
    const stale = generation.generate(savedDraft)
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
      !(await generation.generate(savedDraft)) &&
        count === requestsBeforeReadonly &&
        generation.addPlaceholder() === null,
      'readonly canvas cannot create or submit nodes',
    )
    editor.updateInstanceState({ isReadonly: false })
    editor.updateShape({ id: savedDraft, type: 'image', isLocked: true })
    check(
      !(await generation.generate(savedDraft)) &&
        count === requestsBeforeReadonly,
      'locked placeholder cannot submit',
    )
    editor.updateShape({ id: savedDraft, type: 'image', isLocked: false })
    const deleted = generation.generate(savedDraft)
    editor.markHistoryStoppingPoint('delete pending')
    editor.deleteShapes([savedDraft])
    editor.undo()
    const writesBeforeDelete = writes
    resolveResponse!(png)
    check(
      !(await deleted) && !!draft(savedDraft) && writes === writesBeforeDelete,
      'delete plus undo invalidates late result and restores draft',
    )
    const detached = generation.generate(savedDraft)
    root.unmount()
    const writesBeforeUnmount = writes
    resolveResponse!(png)
    check(
      !(await detached) && writes === writesBeforeUnmount,
      'unmounted canvas ignores late result',
    )
    check(unhandled.length === 0, 'no unhandled promise rejections')
    logs.push('ALL TESTS PASSED')
    reportTest('ALL TESTS PASSED')
  } catch (error) {
    logs.push(`FAIL ${String(error)}`)
    reportTest(`FAIL ${String(error)}`)
  } finally {
    root.unmount()
    assets.dispose()
    clearMocks()
    Object.assign(globalThis, { isTauri: false })
    window.removeEventListener('unhandledrejection', onUnhandled)
    await browserRepository.projects.delete(projectId)
    results.textContent = logs.join('\n')
  }
