import { Add01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import type { Conversation } from './chat-data'
import { ConversationHistoryItem } from './conversation-history-item'

type ConversationHistoryProps = {
  conversations: Array<Conversation>
  activeConversationId: string | null
  pinnedConversationId: string | null
  onSelectConversation: (id: string) => void
  onTogglePin: (id: string) => void
  onDeleteConversation: (id: string) => void
  onNewConversation: () => void
}

export function ConversationHistory({
  conversations,
  activeConversationId,
  pinnedConversationId,
  onSelectConversation,
  onTogglePin,
  onDeleteConversation,
  onNewConversation,
}: ConversationHistoryProps) {
  return (
    <aside className="col-start-1 row-span-2 row-start-1 hidden h-full min-h-0 flex-col gap-4 overflow-hidden rounded-3xl border border-border bg-card/95 p-2 shadow-xl shadow-foreground/5 backdrop-blur-xl md:flex">
      <div className="flex items-center px-2 pt-1">
        <h1 className="text-lg font-semibold tracking-tight">聊天</h1>
      </div>
      <Button
        className="w-full justify-start gap-2 rounded-2xl"
        onClick={onNewConversation}
      >
        <HugeiconsIcon icon={Add01Icon} data-icon="inline-start" />
        新建对话
      </Button>

      <Input aria-label="搜索历史记录" placeholder="搜索对话" />
      <div className="flex items-center gap-2 px-2 text-sm tracking-wide text-muted-foreground uppercase">
        最近对话
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
        {conversations.map((conversation) => (
          <ConversationHistoryItem
            active={activeConversationId === conversation.id}
            conversation={conversation}
            key={conversation.id}
            onDelete={() => onDeleteConversation(conversation.id)}
            onSelect={() => onSelectConversation(conversation.id)}
            onTogglePin={() => onTogglePin(conversation.id)}
            pinned={pinnedConversationId === conversation.id}
          />
        ))}
      </div>
    </aside>
  )
}
