import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  Copy01Icon,
  Delete02Icon,
  ImageFlipHorizontalIcon,
  ImageFlipVerticalIcon,
  Layers01Icon,
  LayerBringToFrontIcon,
  LayerSendToBackIcon,
  SquareLock01Icon,
  SquareUnlock01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { type Editor, useValue } from 'tldraw'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { InspectorAction } from './inspector-controls'

const layerActions = [
  { method: 'bringToFront', label: '移到顶层', icon: LayerBringToFrontIcon },
  { method: 'bringForward', label: '上移一层', icon: ArrowUp01Icon },
  { method: 'sendBackward', label: '下移一层', icon: ArrowDown01Icon },
  { method: 'sendToBack', label: '移到底层', icon: LayerSendToBackIcon },
] as const

export function InspectorActions({ editor }: { editor: Editor }) {
  const selection = useValue(
    'inspector quick actions',
    () => {
      const shapes = editor.getSelectedShapes()
      return {
        ids: shapes.map((shape) => shape.id),
        allLocked: shapes.every((shape) => shape.isLocked),
        disabled:
          editor.getIsReadonly() ||
          shapes.every((shape) => editor.isShapeOrAncestorLocked(shape)),
        readonly: editor.getIsReadonly(),
        cropping: editor.isIn('select.crop'),
      }
    },
    [editor],
  )
  const run = (label: string, action: () => void) => {
    editor.markHistoryStoppingPoint(label)
    action()
    editor.focus()
  }
  const disabled = selection.disabled || selection.cropping
  return (
    <div
      className="flex items-center gap-2"
      role="toolbar"
      aria-label="属性快捷操作"
    >
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              aria-label="图层顺序"
              size="icon-sm"
              variant="ghost"
              disabled={disabled}
            />
          }
        >
          <HugeiconsIcon icon={Layers01Icon} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuGroup>
            {layerActions.map((item) => (
              <DropdownMenuItem
                key={item.method}
                onClick={() =>
                  run(item.method, () => editor[item.method](selection.ids))
                }
              >
                <HugeiconsIcon icon={item.icon} />
                {item.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              aria-label="翻转"
              size="icon-sm"
              variant="ghost"
              disabled={disabled}
            />
          }
        >
          <HugeiconsIcon icon={ImageFlipHorizontalIcon} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuGroup>
            <DropdownMenuItem
              onClick={() =>
                run('flip selection horizontally', () =>
                  editor.flipShapes(selection.ids, 'horizontal'),
                )
              }
            >
              <HugeiconsIcon icon={ImageFlipHorizontalIcon} />
              水平翻转
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                run('flip selection vertically', () =>
                  editor.flipShapes(selection.ids, 'vertical'),
                )
              }
            >
              <HugeiconsIcon icon={ImageFlipVerticalIcon} />
              垂直翻转
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <InspectorAction
        label={selection.allLocked ? '解锁' : '锁定'}
        icon={selection.allLocked ? SquareLock01Icon : SquareUnlock01Icon}
        disabled={selection.readonly || selection.cropping}
        onClick={() =>
          run('toggle selection lock', () => editor.toggleLock(selection.ids))
        }
      />
      <InspectorAction
        label="创建副本"
        icon={Copy01Icon}
        disabled={disabled}
        onClick={() =>
          run('duplicate inspector selection', () =>
            editor.duplicateShapes(selection.ids, { x: 24, y: 24 }),
          )
        }
      />
      <InspectorAction
        label="删除"
        icon={Delete02Icon}
        disabled={disabled}
        onClick={() =>
          run('delete inspector selection', () =>
            editor.deleteShapes(selection.ids),
          )
        }
      />
    </div>
  )
}
