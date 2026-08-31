import { SparklesIcon, UserIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Bubble, BubbleContent } from '@/components/ui/bubble'
import { Message, MessageAvatar, MessageContent } from '@/components/ui/message'
import { cn } from '@/lib/utils'

import type { ChatMessage } from './chat-data'

type ChatBubbleProps = ChatMessage

export function ChatBubble({ role, content }: ChatBubbleProps) {
  const isUser = role === 'user'

  return (
    <Message align={isUser ? 'end' : 'start'}>
      <MessageAvatar
        className={cn(
          'size-9 rounded-2xl',
          isUser
            ? 'bg-secondary text-muted-foreground'
            : 'bg-primary/15 text-primary',
        )}
      >
        <Avatar className="size-full rounded-2xl">
          <AvatarFallback
            className={cn(
              'size-full rounded-2xl',
              isUser
                ? 'bg-secondary text-muted-foreground'
                : 'bg-primary/15 text-primary',
            )}
          >
            <HugeiconsIcon icon={isUser ? UserIcon : SparklesIcon} />
          </AvatarFallback>
        </Avatar>
      </MessageAvatar>
      <MessageContent className="max-w-xl">
        <Bubble
          align={isUser ? 'end' : 'start'}
          variant={isUser ? 'default' : 'tinted'}
        >
          <BubbleContent className="whitespace-pre-wrap">
            {content}
          </BubbleContent>
        </Bubble>
      </MessageContent>
    </Message>
  )
}
