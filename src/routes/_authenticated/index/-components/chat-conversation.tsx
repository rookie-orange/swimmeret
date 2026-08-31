import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from '@/components/ui/message-scroller'

import { ChatBubble } from './chat-bubble'
import { starterPrompts, type ChatMessage } from './chat-data'
import { StarterPrompt } from './starter-prompt'

type ChatConversationProps = {
  conversationTitle: string
  messages: Array<ChatMessage>
  onPromptSelect: (prompt: string) => void
}

export function ChatConversation({
  conversationTitle,
  messages,
  onPromptSelect,
}: ChatConversationProps) {
  const hasUserMessage = messages.some((message) => message.role === 'user')

  return (
    <div className="col-start-1 row-start-1 flex min-h-0 min-w-0 flex-col overflow-hidden px-1 py-4 sm:px-4 md:col-start-2 md:px-4 md:py-6">
      <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col gap-4">
        <MessageScrollerProvider autoScroll>
          <MessageScroller>
            <MessageScrollerViewport>
              <MessageScrollerContent className="justify-center py-8">
                {messages.map((message) => (
                  <MessageScrollerItem
                    key={message.id}
                    messageId={message.id}
                    scrollAnchor={message.role === 'user'}
                  >
                    <ChatBubble {...message} />
                  </MessageScrollerItem>
                ))}

                {!hasUserMessage ? (
                  <MessageScrollerItem messageId="starter-prompts">
                    <div className="grid gap-3 sm:grid-cols-2">
                      {starterPrompts.map((prompt) => (
                        <StarterPrompt
                          key={prompt}
                          onSelect={onPromptSelect}
                          prompt={prompt}
                        />
                      ))}
                    </div>
                  </MessageScrollerItem>
                ) : null}
              </MessageScrollerContent>
            </MessageScrollerViewport>
            <MessageScrollerButton />
          </MessageScroller>
        </MessageScrollerProvider>

        <div className="flex shrink-0 items-center justify-center gap-2 text-xs text-muted-foreground">
          <span className="size-1.5 rounded-full bg-primary" />
          当前对话：{conversationTitle}
        </div>
      </div>
    </div>
  )
}
