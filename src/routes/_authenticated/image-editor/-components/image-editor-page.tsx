import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  AiBackgroundEraserIcon,
  AiSparklesIcon,
  ArrowLeft01Icon,
  ImageAdd01Icon,
  Layers01Icon,
  Redo02Icon,
  ShapesIcon,
  TextIcon,
  Undo02Icon,
  ViewIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

const layers = [
  { name: '标题 · 春日限定', type: '文字', icon: TextIcon },
  { name: '产品主体', type: '图片', icon: ImageAdd01Icon },
  { name: '柔光装饰', type: '形状', icon: ShapesIcon },
  { name: '背景', type: '图片', icon: ImageAdd01Icon },
] as const

const positionValues = ['X  128', 'Y  264', 'W  320', 'H  180'] as const

export function ImageEditorPage() {
  const [selectedLayer, setSelectedLayer] = useState(0)

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden bg-muted/30 pb-2">
      <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-background/90 px-4 backdrop-blur-xl lg:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            aria-label="返回聊天"
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            to="/"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={1.8} />
          </Link>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">图片编辑</p>
            <p className="truncate text-xs text-muted-foreground">
              春日上新 · 未命名海报
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger
              render={<Button aria-label="撤销" size="icon" variant="ghost" />}
            >
              <HugeiconsIcon icon={Undo02Icon} strokeWidth={1.8} />
            </TooltipTrigger>
            <TooltipContent>撤销</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={<Button aria-label="重做" size="icon" variant="ghost" />}
            >
              <HugeiconsIcon icon={Redo02Icon} strokeWidth={1.8} />
            </TooltipTrigger>
            <TooltipContent>重做</TooltipContent>
          </Tooltip>
          <span className="mx-1 hidden h-5 w-px bg-border sm:block" />
          <Button
            className="hidden gap-2 rounded-full sm:inline-flex"
            variant="outline"
          >
            <HugeiconsIcon
              icon={ViewIcon}
              data-icon="inline-start"
              strokeWidth={1.8}
            />
            预览
          </Button>
          <Button className="rounded-full">导出</Button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_280px]">
        <main className="relative flex min-h-0 min-w-0 flex-col overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 text-xs text-muted-foreground lg:px-8">
            <div className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-primary" />
              编辑画布 · 1080 × 1350
            </div>
            <div className="flex items-center gap-1">
              <Button aria-label="缩小画布" size="icon-sm" variant="ghost">
                −
              </Button>
              <span className="min-w-10 text-center">100%</span>
              <Button aria-label="放大画布" size="icon-sm" variant="ghost">
                ＋
              </Button>
            </div>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-6 lg:p-12">
            <div className="relative aspect-[4/5] h-[min(48vh,420px)] max-h-full w-auto shrink-0 overflow-hidden rounded-lg border border-border bg-background shadow-2xl shadow-foreground/10 lg:h-[min(68vh,560px)]">
              <div className="absolute inset-0 bg-secondary" />
              <div className="absolute -top-20 -right-14 size-64 rounded-full bg-primary/60 blur-2xl" />
              <div className="absolute top-28 -left-24 size-52 rounded-full bg-background/80 blur-2xl" />
              <div className="absolute inset-x-8 top-10 flex items-center justify-between text-[10px] font-semibold tracking-[0.18em] text-foreground/60 uppercase">
                <span>swimmeret</span>
                <span>spring / 26</span>
              </div>
              <div className="absolute inset-x-8 bottom-10">
                <p className="text-[11px] font-medium tracking-[0.24em] text-foreground/60 uppercase">
                  freshly brewed
                </p>
                <h1 className="mt-3 max-w-[85%] text-5xl leading-[0.92] font-semibold tracking-[-0.06em] text-foreground sm:text-6xl">
                  春日
                  <br />
                  限定
                </h1>
                <div className="mt-6 flex items-end justify-between gap-4">
                  <p className="max-w-[58%] text-xs leading-5 text-foreground/70">
                    一杯轻盈的季节风味，带着柑橘与花香来到你的下午。
                  </p>
                  <div className="flex size-16 items-center justify-center rounded-full border border-foreground/20 bg-background/40 text-center text-[10px] font-medium leading-3">
                    limited
                    <br />
                    edition
                  </div>
                </div>
              </div>
              <div className="absolute top-[43%] right-[16%] size-28 rotate-12 rounded-[38%] bg-foreground/90 shadow-xl shadow-foreground/20 sm:size-36">
                <div className="absolute inset-3 rounded-[35%] border border-background/20" />
                <div className="absolute top-5 left-5 h-1.5 w-12 rounded-full bg-background/40" />
                <div className="absolute right-4 bottom-5 left-5 h-2 rounded-full bg-primary/70" />
              </div>
              <div className="absolute top-[54%] left-[12%] size-8 rounded-full bg-primary shadow-lg" />
              <div className="absolute top-[61%] left-[20%] size-3 rounded-full bg-foreground/50" />
            </div>
          </div>
        </main>

        <aside className="hidden min-h-0 flex-col border-l border-border bg-background/90 lg:flex">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <HugeiconsIcon icon={Layers01Icon} strokeWidth={1.8} />
              图层
            </div>
            <Button
              aria-label="添加图层"
              className="rounded-full"
              size="icon-sm"
              variant="ghost"
            >
              <HugeiconsIcon icon={ImageAdd01Icon} strokeWidth={1.8} />
            </Button>
          </div>
          <div className="flex flex-col gap-1 border-b border-border p-2">
            {layers.map((layer, index) => (
              <Button
                className={cn(
                  'group h-auto w-full justify-start gap-3 rounded-xl px-3 py-2 text-left font-normal',
                  selectedLayer === index && 'bg-secondary text-foreground',
                )}
                key={layer.name}
                onClick={() => setSelectedLayer(index)}
                variant="ghost"
              >
                <HugeiconsIcon
                  icon={layer.icon}
                  className="text-muted-foreground"
                  strokeWidth={1.8}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{layer.name}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {layer.type}
                  </span>
                </span>
              </Button>
            ))}
          </div>
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                选中图层
              </p>
              <p className="mt-1 text-sm font-medium">
                {layers[selectedLayer]?.name}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {positionValues.map((value) => (
                <div
                  className="rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground"
                  key={value}
                >
                  {value}
                </div>
              ))}
            </div>
            <div className="rounded-2xl border border-primary/20 bg-primary/10 p-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <HugeiconsIcon
                  icon={AiSparklesIcon}
                  className="text-primary"
                  strokeWidth={1.8}
                />
                AI 助手
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                选中图层后，可以让 AI 进行抠图、替换、扩图或风格统一。
              </p>
              <Button
                className="mt-3 w-full rounded-xl"
                size="sm"
                variant="outline"
              >
                <HugeiconsIcon
                  icon={AiBackgroundEraserIcon}
                  data-icon="inline-start"
                  strokeWidth={1.8}
                />
                分离当前图层
              </Button>
            </div>
          </div>
        </aside>
      </div>
    </section>
  )
}
