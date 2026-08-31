import {
  Delete01Icon,
  MoreHorizontalIcon,
  PencilEdit01Icon,
  PinIcon,
  PinOffIcon,
  Share01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

import type { Conversation } from './chat-data'

type ConversationHistoryItemProps = {
  conversation: Conversation
  active: boolean
  pinned: boolean
  onSelect: () => void
  onTogglePin: () => void
  onDelete: () => void
}

export function ConversationHistoryItem({
  conversation,
  active,
  pinned,
  onSelect,
  onTogglePin,
  onDelete,
}: ConversationHistoryItemProps) {
  return (
    <div
      className={cn(
        'group flex min-h-10 w-full items-center gap-1 rounded-2xl px-2 transition-colors hover:bg-secondary',
        active && 'bg-secondary',
      )}
    >
      <Button
        className="min-w-0 flex-1 justify-start rounded-xl px-2 text-left font-normal"
        onClick={onSelect}
        variant="ghost"
      >
        <span className="block truncate text-sm">{conversation.title}</span>
      </Button>
      <div
        className={cn(
          'flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100',
          pinned && 'opacity-100',
        )}
      >
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                aria-label={pinned ? '取消置顶' : '置顶聊天'}
                className={cn(
                  'size-8 rounded-full text-muted-foreground',
                  pinned && 'bg-primary/15 text-primary opacity-100',
                )}
                onClick={onTogglePin}
                size="icon-sm"
                variant="ghost"
              />
            }
          >
            <HugeiconsIcon icon={pinned ? PinOffIcon : PinIcon} />
          </TooltipTrigger>
          <TooltipContent>{pinned ? '取消置顶' : '置顶聊天'}</TooltipContent>
        </Tooltip>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                aria-label="更多操作"
                className="size-8 rounded-full text-muted-foreground"
                size="icon-sm"
                variant="ghost"
              />
            }
          >
            <HugeiconsIcon icon={MoreHorizontalIcon} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="right" sideOffset={8}>
            <DropdownMenuGroup>
              <DropdownMenuItem disabled>
                <HugeiconsIcon icon={Share01Icon} />
                分享
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <HugeiconsIcon icon={PencilEdit01Icon} />
                重命名
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onTogglePin}>
                <HugeiconsIcon icon={pinned ? PinOffIcon : PinIcon} />
                {pinned ? '取消置顶' : '置顶聊天'}
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={onDelete}>
                <HugeiconsIcon icon={Delete01Icon} />
                删除
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
