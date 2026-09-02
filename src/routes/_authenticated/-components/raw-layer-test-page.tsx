import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Alert02Icon,
  Cancel01Icon,
  ImageAdd01Icon,
  ImageIcon,
  Tick02Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { Button } from '@/components/ui/button'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import {
  cleanupDecompositionJob,
  decomposeLayerSource,
  discardLayerSource,
  getLayerDecompositionError,
  readDecompositionAsset,
  stageLayerSource,
  type LayerDecompositionManifest,
  type LayerDecompositionProgress,
  type LayerManifestAsset,
  type LayerResolution,
} from '@/lib/layer-decomposition'
import { cn } from '@/lib/utils'

const ACCEPTED_TYPES = new Set(['image/png', 'image/jpeg'])

const RESOLUTION_OPTIONS: Array<{ label: string; value: LayerResolution }> = [
  { label: '自动', value: 'auto' },
  { label: '1K', value: '1K' },
  { label: '1.5K', value: '1.5K' },
  { label: '2K', value: '2K' },
]

type RunStatus =
  | 'idle'
  | 'reading'
  | 'uploading'
  | 'generating'
  | 'downloading'
  | 'success'
  | 'error'

interface SourceMeta {
  bytes: number
  height: number
  name: string
  sha256: string
  type: string
  width: number
}

interface ResultLayer {
  asset: LayerManifestAsset
  url: string
}

const STATUS_LABELS: Record<RunStatus, string> = {
  downloading: '正在下载图层',
  error: '请求失败',
  generating: 'Ark 正在识别并拆分',
  idle: '等待选择图片',
  reading: '正在读取原始文件',
  success: '分离完成',
  uploading: '正在发送原始文件',
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MiB`
}

function bytesToHex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes), (value) =>
    value.toString(16).padStart(2, '0'),
  ).join('')
}

function readImageDimensions(file: File) {
  return new Promise<{ height: number; width: number }>((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ height: image.naturalHeight, width: image.naturalWidth })
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('浏览器无法解码这张图片'))
    }
    image.src = url
  })
}

async function inspectFile(file: File): Promise<SourceMeta> {
  const [{ height, width }, bytes] = await Promise.all([
    readImageDimensions(file),
    file.arrayBuffer(),
  ])
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return {
    bytes: file.size,
    height,
    name: file.name,
    sha256: bytesToHex(digest),
    type: file.type || 'application/octet-stream',
    width,
  }
}

function layerLabel(asset: LayerManifestAsset) {
  return asset.zIndex === 0 ? '底图' : `图层 ${asset.zIndex}`
}

export function RawLayerTestPage() {
  const inputRef = useRef<HTMLInputElement>(null)
  const mountedRef = useRef(true)
  const previewUrlRef = useRef<string | null>(null)
  const layerUrlsRef = useRef<string[]>([])
  const jobIdRef = useRef<string | null>(null)
  const stagedSourceIdRef = useRef<string | null>(null)

  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [sourceMeta, setSourceMeta] = useState<SourceMeta | null>(null)
  const [prompt, setPrompt] = useState('')
  const [size, setSize] = useState<LayerResolution>('auto')
  const [status, setStatus] = useState<RunStatus>('idle')
  const [progress, setProgress] = useState<LayerDecompositionProgress | null>(
    null,
  )
  const [error, setError] = useState<string | null>(null)
  const [manifest, setManifest] = useState<LayerDecompositionManifest | null>(
    null,
  )
  const [layers, setLayers] = useState<ResultLayer[]>([])

  const isBusy =
    status === 'reading' ||
    status === 'uploading' ||
    status === 'generating' ||
    status === 'downloading'

  const revokeLayerUrls = useCallback(() => {
    for (const url of layerUrlsRef.current) URL.revokeObjectURL(url)
    layerUrlsRef.current = []
    setLayers([])
  }, [])

  const cleanupBackend = useCallback(async () => {
    const stagedSourceId = stagedSourceIdRef.current
    stagedSourceIdRef.current = null
    const jobId = jobIdRef.current
    jobIdRef.current = null
    await Promise.allSettled([
      stagedSourceId ? discardLayerSource(stagedSourceId) : Promise.resolve(),
      jobId ? cleanupDecompositionJob(jobId) : Promise.resolve(),
    ])
  }, [])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
      for (const url of layerUrlsRef.current) URL.revokeObjectURL(url)
      layerUrlsRef.current = []
      void cleanupBackend()
    }
  }, [cleanupBackend])

  const handleFile = useCallback(
    async (nextFile: File | null) => {
      if (!nextFile) return
      if (!ACCEPTED_TYPES.has(nextFile.type)) {
        setError('请选择 PNG 或 JPEG 图片；此实验页不会经过 tldraw 转换。')
        setStatus('error')
        return
      }

      setStatus('reading')
      setError(null)
      setManifest(null)
      setProgress(null)
      revokeLayerUrls()
      await cleanupBackend()

      try {
        const meta = await inspectFile(nextFile)
        if (!mountedRef.current) return
        const nextPreviewUrl = URL.createObjectURL(nextFile)
        if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
        previewUrlRef.current = nextPreviewUrl
        setFile(nextFile)
        setPreviewUrl(nextPreviewUrl)
        setSourceMeta(meta)
        setStatus('idle')
      } catch (inspectError) {
        if (!mountedRef.current) return
        setStatus('error')
        setError(
          inspectError instanceof Error
            ? inspectError.message
            : '无法读取图片文件',
        )
      }
    },
    [cleanupBackend, revokeLayerUrls],
  )

  const handleRun = useCallback(async () => {
    if (!file || isBusy) return
    setError(null)
    setManifest(null)
    setProgress(null)
    revokeLayerUrls()
    await cleanupBackend()

    try {
      setStatus('uploading')
      const staged = await stageLayerSource(file)
      stagedSourceIdRef.current = staged.sourceId
      if (!mountedRef.current) return

      setStatus('generating')
      const nextManifest = await decomposeLayerSource(
        staged.sourceId,
        prompt,
        size,
        (nextProgress) => {
          if (!mountedRef.current) return
          setProgress(nextProgress)
          setStatus(nextProgress.stage)
        },
      )
      stagedSourceIdRef.current = null
      jobIdRef.current = nextManifest.jobId
      setManifest(nextManifest)

      const nextLayers = await Promise.all(
        nextManifest.assets.map(async (asset) => {
          const bytes = await readDecompositionAsset(
            nextManifest.jobId,
            asset.assetId,
          )
          const url = URL.createObjectURL(
            new Blob([bytes], { type: asset.mimeType }),
          )
          layerUrlsRef.current.push(url)
          return { asset, url }
        }),
      )
      if (!mountedRef.current) return
      setLayers(nextLayers.sort((a, b) => a.asset.zIndex - b.asset.zIndex))
      setStatus('success')
      await cleanupBackend()
    } catch (runError) {
      if (!mountedRef.current) return
      setStatus('error')
      setError(getLayerDecompositionError(runError))
      await cleanupBackend()
    }
  }, [cleanupBackend, file, isBusy, prompt, revokeLayerUrls, size])

  useEffect(() => {
    if (!file || !sourceMeta || status !== 'idle') return
    const timer = window.setTimeout(() => {
      void handleRun()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [file, handleRun, sourceMeta, status])

  const clearFile = useCallback(async () => {
    if (isBusy) return
    await cleanupBackend()
    revokeLayerUrls()
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    previewUrlRef.current = null
    setFile(null)
    setPreviewUrl(null)
    setSourceMeta(null)
    setManifest(null)
    setProgress(null)
    setError(null)
    setStatus('idle')
    if (inputRef.current) inputRef.current.value = ''
  }, [cleanupBackend, isBusy, revokeLayerUrls])

  return (
    <section className="relative h-full min-h-0 overflow-auto bg-background">
      <div className="mx-auto flex min-h-full w-full max-w-7xl flex-col gap-8 px-5 py-10 sm:px-8 lg:px-12">
        <header className="flex flex-col gap-4 border-b border-border pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <HugeiconsIcon icon={ImageIcon} size={24} strokeWidth={1.8} />
            </div>
            <div>
              <p className="mb-1 text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
                Seedream / 原始输入实验
              </p>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                原图分离实验台
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                直接把本地 PNG/JPEG 交给 Rust 后端，不创建 tldraw
                shape，也不调用
                <code className="mx-1 rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
                  editor.toImage()
                </code>
                。用于和画布导出结果做输入级对照。
              </p>
            </div>
          </div>
          <StatusBadge status={status} />
        </header>

        <div className="grid min-h-0 gap-6 xl:grid-cols-[minmax(19rem,0.8fr)_minmax(0,1.2fr)]">
          <div className="flex min-w-0 flex-col gap-6">
            <section className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
                    01 / Input
                  </p>
                  <h2 className="mt-1 text-lg font-semibold">选择原始图片</h2>
                </div>
                {file ? (
                  <Button
                    disabled={isBusy}
                    onClick={() => void clearFile()}
                    size="sm"
                    variant="ghost"
                  >
                    <HugeiconsIcon
                      data-icon="inline-start"
                      icon={Cancel01Icon}
                    />
                    重置
                  </Button>
                ) : null}
              </div>

              <input
                accept="image/png,image/jpeg"
                className="sr-only"
                disabled={isBusy}
                id="raw-layer-test-file"
                onChange={(event) => {
                  void handleFile(event.target.files?.[0] ?? null)
                  event.currentTarget.value = ''
                }}
                ref={inputRef}
                type="file"
              />
              <label
                className={cn(
                  'group flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-8 text-center transition-colors hover:border-primary/60 hover:bg-primary/5',
                  isBusy && 'pointer-events-none opacity-60',
                )}
                htmlFor="raw-layer-test-file"
              >
                <span className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-background text-muted-foreground shadow-sm transition-transform group-hover:-translate-y-0.5 group-hover:text-foreground">
                  <HugeiconsIcon
                    icon={ImageAdd01Icon}
                    size={22}
                    strokeWidth={1.8}
                  />
                </span>
                <span className="text-sm font-medium text-foreground">
                  {file ? '重新选择图片' : '选择 PNG 或 JPEG'}
                </span>
                <span className="mt-1 text-xs leading-5 text-muted-foreground">
                  选中后自动发送原始 File，不经过 tldraw
                </span>
              </label>

              {previewUrl && sourceMeta ? (
                <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-muted/20">
                  <div className="flex max-h-72 min-h-40 items-center justify-center overflow-hidden bg-[linear-gradient(45deg,var(--muted)_25%,transparent_25%,transparent_75%,var(--muted)_75%),linear-gradient(45deg,var(--muted)_25%,transparent_25%,transparent_75%,var(--muted)_75%)] bg-[length:20px_20px] bg-[position:0_0,10px_10px] p-3">
                    <img
                      alt={`原始图片：${sourceMeta.name}`}
                      className="max-h-64 max-w-full object-contain shadow-md"
                      src={previewUrl}
                    />
                  </div>
                  <div className="grid gap-px border-t border-border bg-border sm:grid-cols-2">
                    <MetaCell label="文件" value={sourceMeta.name} />
                    <MetaCell
                      label="格式 / 大小"
                      value={`${sourceMeta.type} · ${formatBytes(sourceMeta.bytes)}`}
                    />
                    <MetaCell
                      label="像素 / 比例"
                      value={`${sourceMeta.width} × ${sourceMeta.height} · ${(sourceMeta.width / sourceMeta.height).toFixed(3)}`}
                    />
                    <MetaCell label="SHA-256" value={sourceMeta.sha256} mono />
                  </div>
                </div>
              ) : null}
            </section>

            <section className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
              <div className="mb-5">
                <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
                  02 / Request
                </p>
                <h2 className="mt-1 text-lg font-semibold">保持请求参数可控</h2>
              </div>
              <FieldGroup className="gap-5">
                <Field>
                  <FieldLabel htmlFor="raw-layer-test-prompt">
                    拆分意图（可选）
                  </FieldLabel>
                  <Textarea
                    disabled={isBusy}
                    id="raw-layer-test-prompt"
                    maxLength={4000}
                    onChange={(event) => setPrompt(event.target.value)}
                    placeholder="留空时由模型自动识别所有主要元素"
                    rows={4}
                    value={prompt}
                  />
                  <FieldDescription>
                    当前字符数：{prompt.length}。不会把 prompt 正文写入 Rust
                    日志。
                  </FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="raw-layer-test-size">
                    输出分辨率
                  </FieldLabel>
                  <Select
                    disabled={isBusy}
                    items={RESOLUTION_OPTIONS}
                    onValueChange={(value) => {
                      if (value) setSize(value)
                    }}
                    value={size}
                  >
                    <SelectTrigger className="w-full" id="raw-layer-test-size">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false}>
                      <SelectGroup>
                        {RESOLUTION_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              </FieldGroup>

              {progress?.stage === 'downloading' ? (
                <p className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
                  <Spinner /> 下载图层 {progress.current}/{progress.total}
                </p>
              ) : null}
              <FieldError className="mt-5">{error}</FieldError>
              <Button
                className="mt-5 w-full"
                disabled={!file || isBusy}
                onClick={() => void handleRun()}
              >
                {isBusy ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <HugeiconsIcon
                    data-icon="inline-start"
                    icon={ImageAdd01Icon}
                  />
                )}
                {isBusy ? STATUS_LABELS[status] : '重新发送原图并分离'}
              </Button>
            </section>
          </div>

          <section className="flex min-h-[32rem] min-w-0 flex-col rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
                  03 / Output
                </p>
                <h2 className="mt-1 text-lg font-semibold">模型返回结果</h2>
              </div>
              {manifest ? (
                <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                  {manifest.assets.length} 个产出
                </span>
              ) : null}
            </div>

            {status === 'error' ? (
              <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center">
                <HugeiconsIcon
                  className="text-destructive"
                  icon={Alert02Icon}
                  size={28}
                />
                <p className="mt-4 text-sm font-medium text-destructive">
                  Ark 未接受这张原图
                </p>
                <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  {error ?? '请查看终端中的 request_id、尺寸和 MIME 日志。'}
                </p>
              </div>
            ) : layers.length > 0 ? (
              <div className="grid min-w-0 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                {layers.map(({ asset, url }) => (
                  <LayerCard asset={asset} key={asset.assetId} url={url} />
                ))}
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 p-8 text-center">
                <span className="flex size-14 items-center justify-center rounded-2xl bg-background text-muted-foreground shadow-sm">
                  <HugeiconsIcon icon={ImageIcon} size={26} strokeWidth={1.6} />
                </span>
                <p className="mt-4 text-sm font-medium text-foreground">
                  结果会显示在这里
                </p>
                <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                  先选择一张原始 PNG/JPEG；选中后会自动发起请求。
                </p>
              </div>
            )}

            {manifest ? (
              <div className="mt-5 grid gap-3 rounded-2xl border border-border bg-muted/20 p-4 text-xs text-muted-foreground sm:grid-cols-3">
                <MetaCell label="模型" value={manifest.model} />
                <MetaCell label="Job ID" value={manifest.jobId} mono />
                <MetaCell
                  label="Usage"
                  value={
                    manifest.usage
                      ? `${manifest.usage.generatedImages ?? '-'} images · ${manifest.usage.outputTokens ?? '-'} tokens`
                      : '未返回 usage'
                  }
                />
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </section>
  )
}

function StatusBadge({ status }: { status: RunStatus }) {
  const isSuccess = status === 'success'
  const isError = status === 'error'
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 self-start rounded-full border px-3 py-1.5 text-xs font-medium sm:self-auto',
        isSuccess && 'border-primary/30 bg-primary/10 text-primary-foreground',
        isError && 'border-destructive/30 bg-destructive/10 text-destructive',
        !isSuccess && !isError && 'border-border bg-card text-muted-foreground',
      )}
    >
      {isSuccess ? (
        <HugeiconsIcon icon={Tick02Icon} size={14} />
      ) : isError ? (
        <HugeiconsIcon icon={Alert02Icon} size={14} />
      ) : (
        <span className="size-1.5 rounded-full bg-primary" />
      )}
      {STATUS_LABELS[status]}
    </div>
  )
}

function MetaCell({
  label,
  mono = false,
  value,
}: {
  label: string
  mono?: boolean
  value: string
}) {
  return (
    <div className="min-w-0 bg-card px-3 py-2.5">
      <p className="text-[10px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
        {label}
      </p>
      <p
        className={cn(
          'mt-1 truncate text-xs text-foreground',
          mono && 'font-mono text-[10px]',
        )}
        title={value}
      >
        {value}
      </p>
    </div>
  )
}

function LayerCard({ asset, url }: ResultLayer) {
  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-muted/20">
      <div className="flex aspect-square items-center justify-center overflow-hidden bg-[linear-gradient(45deg,var(--muted)_25%,transparent_25%,transparent_75%,var(--muted)_75%),linear-gradient(45deg,var(--muted)_25%,transparent_25%,transparent_75%,var(--muted)_75%)] bg-[length:20px_20px] bg-[position:0_0,10px_10px] p-3">
        <img
          alt={asset.description ?? asset.name ?? layerLabel(asset)}
          className="max-h-full max-w-full object-contain"
          loading="lazy"
          src={url}
        />
      </div>
      <div className="border-t border-border p-3">
        <div className="flex items-center justify-between gap-3">
          <p className="truncate text-sm font-medium text-foreground">
            {asset.name ?? layerLabel(asset)}
          </p>
          <span className="shrink-0 rounded-full bg-background px-2 py-1 font-mono text-[10px] text-muted-foreground">
            z={asset.zIndex}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {asset.width} × {asset.height} · {asset.mimeType}
        </p>
        {asset.description ? (
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
            {asset.description}
          </p>
        ) : null}
      </div>
    </article>
  )
}
