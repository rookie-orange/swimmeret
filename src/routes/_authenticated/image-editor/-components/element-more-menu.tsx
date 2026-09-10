import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  ClipboardIcon,
  Copy01Icon,
  Delete02Icon,
  Download01Icon,
  GroupLayersIcon,
  LayerBringToFrontIcon,
  Layers01Icon,
  LayerSendToBackIcon,
  LockKeyIcon,
  MoreHorizontalIcon,
  ScissorIcon,
  SlidersHorizontalIcon,
  SquareUnlock01Icon,
  UngroupLayersIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useActions, useEditor, useValue } from 'tldraw'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const layerActions = [
  { id: 'bring-to-front', label: '移到顶层', icon: LayerBringToFrontIcon },
  { id: 'bring-forward', label: '上移一层', icon: ArrowUp01Icon },
  { id: 'send-backward', label: '下移一层', icon: ArrowDown01Icon },
  { id: 'send-to-back', label: '移到底层', icon: LayerSendToBackIcon },
] as const

export function ElementMoreMenu({
  disabled,
  onDuplicate,
  onExport,
  onOpenProperties,
}: {
  disabled: boolean
  onDuplicate: () => void
  onExport: () => void
  onOpenProperties: () => void
}) {
  const editor = useEditor()
  const actions = useActions()
  const selection = useValue(
    'element more menu selection',
    () => {
      const shapes = editor.getSelectedShapes()
      const unlocked = shapes.filter(
        (shape) => !editor.isShapeOrAncestorLocked(shape),
      )
      const isReadonly = editor.getInstanceState().isReadonly
      return {
        count: shapes.length,
        isReadonly,
        canEdit: !isReadonly && unlocked.length > 0,
        canGroup:
          !isReadonly && shapes.length > 1 && unlocked.length === shapes.length,
        canUngroup:
          !isReadonly && unlocked.some((shape) => shape.type === 'group'),
        allLocked: shapes.every((shape) => shape.isLocked),
        isImage: shapes.length === 1 && shapes[0]?.type === 'image',
      }
    },
    [editor],
  )
  const clipboard =
    editor.getContainer().ownerDocument.defaultView?.navigator.clipboard
  const runAction = (id: string) => {
    void actions[id].onSelect('actions-menu')
    editor.focus()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        render={<Button aria-label="更多操作" size="icon-sm" variant="ghost" />}
      >
        <HugeiconsIcon icon={MoreHorizontalIcon} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60" sideOffset={8}>
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            {selection.count > 1
              ? `已选中 ${selection.count} 个元素`
              : '元素操作'}
          </DropdownMenuLabel>
          <DropdownMenuItem
            disabled={!clipboard?.write}
            onClick={() => runAction('copy')}
          >
            <HugeiconsIcon icon={Copy01Icon} />
            复制
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!selection.canEdit || !clipboard?.write}
            onClick={() => runAction('cut')}
          >
            <HugeiconsIcon icon={ScissorIcon} />
            剪切
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={selection.isReadonly || !clipboard?.read}
            onClick={() => runAction('paste')}
          >
            <HugeiconsIcon icon={ClipboardIcon} />
            粘贴
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!selection.canEdit} onClick={onDuplicate}>
            <HugeiconsIcon icon={Copy01Icon} />
            创建副本
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger disabled={!selection.canEdit}>
              <HugeiconsIcon icon={Layers01Icon} />
              图层顺序
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuGroup>
                {layerActions.map((action) => (
                  <DropdownMenuItem
                    key={action.id}
                    onClick={() => runAction(action.id)}
                  >
                    <HugeiconsIcon icon={action.icon} />
                    {action.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          {selection.count > 1 ? (
            <DropdownMenuItem
              disabled={!selection.canGroup}
              onClick={() => runAction('group')}
            >
              <HugeiconsIcon icon={GroupLayersIcon} />
              组合
            </DropdownMenuItem>
          ) : null}
          {selection.canUngroup ? (
            <DropdownMenuItem onClick={() => runAction('ungroup')}>
              <HugeiconsIcon icon={UngroupLayersIcon} />
              取消组合
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem
            disabled={selection.isReadonly}
            onClick={() => runAction('toggle-lock')}
          >
            <HugeiconsIcon
              icon={selection.allLocked ? SquareUnlock01Icon : LockKeyIcon}
            />
            {selection.allLocked ? '解锁' : '锁定'}
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={onExport}>
            <HugeiconsIcon icon={Download01Icon} />
            导出
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!selection.canEdit}
            onClick={() => runAction('delete')}
            variant="destructive"
          >
            <HugeiconsIcon icon={Delete02Icon} />
            删除
          </DropdownMenuItem>
        </DropdownMenuGroup>
        {selection.isImage ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={onOpenProperties}>
                <HugeiconsIcon icon={SlidersHorizontalIcon} />
                属性设置
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
