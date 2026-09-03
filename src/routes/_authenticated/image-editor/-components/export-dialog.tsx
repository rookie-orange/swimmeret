import { useMemo, useState } from 'react'
import { Download01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { exportAs, type Editor, type TLShapeId, useValue } from 'tldraw'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

const FORMAT_OPTIONS = [
  { label: 'JPG', value: 'jpeg' as const },
  { label: 'PNG', value: 'png' as const },
]

const SCALE_OPTIONS = [
  { label: '原始尺寸', value: '1' },
  { label: '0.5x', value: '0.5' },
  { label: '1.5x', value: '1.5' },
  { label: '2x', value: '2' },
  { label: '3x', value: '3' },
  { label: '4x', value: '4' },
]

type ExportFormat = (typeof FORMAT_OPTIONS)[number]['value']
type ExportRange = 'all' | 'selection'

interface ExportDialogProps {
  editor: Editor | null
  open: boolean
  onOpenChange: (open: boolean) => void
  shapeIds?: TLShapeId[]
}

export function ExportDialog({
  editor,
  open,
  onOpenChange,
  shapeIds,
}: ExportDialogProps) {
  const selectionCount = useValue(
    'image editor export selection count',
    () => editor?.getSelectedShapeIds().length ?? 0,
    [editor],
  )
  const hasSelection = Boolean(shapeIds?.length || selectionCount > 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-128">
        <DialogHeader className="gap-2">
          <DialogTitle className="text-2xl font-semibold tracking-tight">
            导出作品
          </DialogTitle>
          <DialogDescription>
            选择文件格式、尺寸和要导出的画布内容。
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <ExportForm
            editor={editor}
            hasSelection={hasSelection}
            key={`${hasSelection}-${shapeIds?.join(',') ?? ''}`}
            onCancel={() => onOpenChange(false)}
            onDone={() => onOpenChange(false)}
            shapeIds={shapeIds}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function ExportForm({
  editor,
  hasSelection,
  onCancel,
  onDone,
  shapeIds,
}: {
  editor: Editor | null
  hasSelection: boolean
  onCancel: () => void
  onDone: () => void
  shapeIds?: TLShapeId[]
}) {
  const [format, setFormat] = useState<ExportFormat>('jpeg')
  const [scale, setScale] = useState('1')
  const [range, setRange] = useState<ExportRange>(
    hasSelection ? 'selection' : 'all',
  )
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const rangeOptions = useMemo(() => {
    if (!hasSelection) return [{ label: '全部内容', value: 'all' as const }]
    return [
      {
        label: `全部内容 ${editor?.getCurrentPageShapeIds().size ?? 0}`,
        value: 'all' as const,
      },
      { label: '当前选中', value: 'selection' as const },
    ]
  }, [editor, hasSelection])

  const handleExport = async () => {
    if (!editor) return
    setIsExporting(true)
    setError(null)
    try {
      const selectedIds = (shapeIds ?? editor.getSelectedShapeIds()).filter(
        (id) => Boolean(editor.getShape(id)),
      )
      const ids =
        range === 'selection' && selectedIds.length > 0
          ? selectedIds
          : [...editor.getCurrentPageShapeIds()]
      if (ids.length === 0) {
        setError('画布中暂无可导出的内容')
        return
      }
      await exportAs(editor, ids, {
        format,
        scale: Number(scale),
        name: 'swimmeret-export',
      })
      onDone()
    } catch {
      setError('导出失败，请稍后重试')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-3">
        <p className="text-sm font-semibold text-foreground">作品类型</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr]">
          <Select
            items={FORMAT_OPTIONS}
            onValueChange={(value) => {
              if (value) setFormat(value as ExportFormat)
            }}
            value={format}
          >
            <SelectTrigger className="h-12 w-full rounded-2xl px-4 text-base">
              <SelectValue />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              <SelectGroup>
                {FORMAT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Select
            items={SCALE_OPTIONS}
            onValueChange={(value) => {
              if (value) setScale(value)
            }}
            value={scale}
          >
            <SelectTrigger className="h-12 w-full rounded-2xl px-4 text-base">
              <SelectValue />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              <SelectGroup>
                {SCALE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      {hasSelection ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-foreground">导出范围</p>
          <Tabs
            onValueChange={(value) => {
              if (value === 'all' || value === 'selection') setRange(value)
            }}
            value={range}
          >
            <TabsList className="w-full">
              {rangeOptions.map((option) => (
                <TabsTrigger key={option.value} value={option.value}>
                  {option.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      ) : null}

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <DialogFooter className="gap-3 sm:flex-row sm:justify-between">
        <Button
          className="w-full"
          disabled={!editor || isExporting}
          onClick={() => void handleExport()}
        >
          {isExporting ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <HugeiconsIcon data-icon="inline-start" icon={Download01Icon} />
          )}
          {isExporting ? '正在导出' : '下载'}
        </Button>
      </DialogFooter>
    </div>
  )
}
