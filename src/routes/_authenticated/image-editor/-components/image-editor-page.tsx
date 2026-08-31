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

import { Button, buttonVariants } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

import { ImageEditorDock } from './image-editor-dock'

const layers = [
  { name: '标题 · 春日限定', type: '文字', icon: TextIcon },
  { name: '产品主体', type: '图片', icon: ImageAdd01Icon },
  { name: '柔光装饰', type: '形状', icon: ShapesIcon },
  { name: '背景', type: '图片', icon: ImageAdd01Icon },
] as const

const positionValues = [
  { label: 'X', value: '128' },
  { label: 'Y', value: '264' },
  { label: 'W', value: '320' },
  { label: 'H', value: '180' },
] as const

export function ImageEditorPage() {
  const [selectedLayer, setSelectedLayer] = useState(0)

  return (
    <section className="grid h-full min-h-0 grid-cols-1 grid-rows-[auto_minmax(0,1fr)_auto] gap-4 overflow-hidden bg-muted/40 p-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:grid-rows-[auto_minmax(0,1fr)_auto]">
      <div className="col-start-1 row-start-1 flex min-w-0 items-center justify-between gap-3">
        <header className="flex min-w-0 items-center gap-2 rounded-2xl border border-border bg-card/95 p-2 shadow-xl shadow-foreground/5 backdrop-blur-xl">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              aria-label="返回聊天"
              className={cn(
                buttonVariants({ size: 'icon-sm', variant: 'ghost' }),
                'shrink-0 rounded-full text-muted-foreground',
              )}
              to="/"
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={1.8} />
            </Link>
          </div>
        </header>

        <div className="flex h-14 min-w-0 items-center gap-0.5 rounded-2xl border border-border bg-card/95 p-2 shadow-xl shadow-foreground/5 backdrop-blur-xl">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  aria-label="撤销"
                  className="rounded-full"
                  size="icon-sm"
                  variant="ghost"
                />
              }
            >
              <HugeiconsIcon icon={Undo02Icon} strokeWidth={1.8} />
            </TooltipTrigger>
            <TooltipContent>撤销</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  aria-label="重做"
                  className="hidden rounded-full sm:inline-flex"
                  size="icon-sm"
                  variant="ghost"
                />
              }
            >
              <HugeiconsIcon icon={Redo02Icon} strokeWidth={1.8} />
            </TooltipTrigger>
            <TooltipContent>重做</TooltipContent>
          </Tooltip>
          <Button
            className="hidden rounded-full xl:inline-flex"
            size="sm"
            variant="ghost"
          >
            <HugeiconsIcon
              icon={ViewIcon}
              data-icon="inline-start"
              strokeWidth={1.8}
            />
            预览
          </Button>
          <Button className="rounded-full" size="sm">
            导出
          </Button>
        </div>
      </div>

      <main className="col-start-1 row-start-2 flex min-h-0 min-w-0 items-center justify-center overflow-auto px-1 sm:px-4">
        <div className="relative aspect-[4/5] w-full max-w-sm shrink-0 overflow-hidden rounded-lg border border-border bg-background shadow-2xl shadow-foreground/10 lg:max-w-md">
          <div className="absolute inset-0 bg-secondary" />
          <div className="absolute -top-20 -right-14 size-64 rounded-full bg-primary/60 blur-2xl" />
          <div className="absolute top-28 -left-24 size-52 rounded-full bg-background/80 blur-2xl" />
          <div className="absolute inset-x-8 top-10 flex items-center justify-between text-[10px] font-semibold text-foreground/60 uppercase">
            <span>swimmeret</span>
            <span>spring / 26</span>
          </div>
          <div className="absolute inset-x-8 bottom-10">
            <p className="text-[11px] font-medium text-foreground/60 uppercase">
              freshly brewed
            </p>
            <h1 className="mt-3 max-w-[85%] text-5xl leading-none font-semibold text-foreground sm:text-6xl">
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
      </main>

      <aside className="col-start-2 row-span-3 row-start-1 hidden min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card/95 shadow-xl shadow-foreground/5 backdrop-blur-xl lg:flex">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <HugeiconsIcon icon={Layers01Icon} strokeWidth={1.8} />
              图层
            </div>
            <p className="mt-1 text-xs text-muted-foreground">4 个画布元素</p>
          </div>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  aria-label="添加图层"
                  className="rounded-full"
                  size="icon-sm"
                  variant="ghost"
                />
              }
            >
              <HugeiconsIcon icon={ImageAdd01Icon} strokeWidth={1.8} />
            </TooltipTrigger>
            <TooltipContent>添加图层</TooltipContent>
          </Tooltip>
        </div>
        <div className="flex flex-col gap-1 px-2 pb-3">
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

        <div className="flex flex-col gap-4 border-t border-border p-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              选中图层
            </p>
            <p className="mt-1 truncate text-sm font-medium">
              {layers[selectedLayer]?.name}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {positionValues.map((item) => (
              <div
                className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-xs"
                key={item.label}
              >
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-medium">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-auto border-t border-border bg-primary/10 p-4">
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
          <Button className="mt-3 w-full rounded-xl" size="sm">
            <HugeiconsIcon
              icon={AiBackgroundEraserIcon}
              data-icon="inline-start"
              strokeWidth={1.8}
            />
            分离当前图层
          </Button>
        </div>
      </aside>

      <ImageEditorDock />
    </section>
  )
}
