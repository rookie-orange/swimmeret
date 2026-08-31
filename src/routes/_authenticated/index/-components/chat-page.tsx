import { useState } from 'react'

import { ChatConversation } from './chat-conversation'
import { ChatInput } from './chat-input'
import {
  conversations as initialConversations,
  initialMessages,
  type ChatMessage,
  type Conversation,
} from './chat-data'
import { ConversationHistory } from './conversation-history'

export function ChatPage() {
  const [conversationList, setConversationList] =
    useState<Array<Conversation>>(initialConversations)
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(initialConversations[0]?.id ?? null)
  const [pinnedConversationId, setPinnedConversationId] = useState<
    string | null
  >(null)
  const [messagesByConversation, setMessagesByConversation] =
    useState<Record<string, Array<ChatMessage>>>(initialMessages)

  const activeConversation = conversationList.find(
    (conversation) => conversation.id === activeConversationId,
  )
  const activeMessages = activeConversationId
    ? (messagesByConversation[activeConversationId] ?? [])
    : []

  const handleNewConversation = () => {
    const id = `conversation-${Date.now()}`
    const conversation = { id, title: '新对话' }
    setConversationList((current) => [conversation, ...current])
    setMessagesByConversation((current) => ({ ...current, [id]: [] }))
    setActiveConversationId(id)
  }

  const handleDeleteConversation = (id: string) => {
    const remaining = conversationList.filter(
      (conversation) => conversation.id !== id,
    )
    setConversationList(remaining)
    if (activeConversationId === id) {
      setActiveConversationId(remaining[0]?.id ?? null)
    }
    setPinnedConversationId((pinnedId) => (pinnedId === id ? null : pinnedId))
    setMessagesByConversation((current) => {
      const next = { ...current }
      delete next[id]
      return next
    })
  }

  const handleTogglePin = (id: string) => {
    setPinnedConversationId((current) => (current === id ? null : id))
  }

  const handleSendMessage = (content: string) => {
    if (!activeConversationId) return
    const message: ChatMessage = {
      id: `${activeConversationId}-${Date.now()}`,
      role: 'user',
      content,
    }
    setMessagesByConversation((current) => ({
      ...current,
      [activeConversationId]: [
        ...(current[activeConversationId] ?? []),
        message,
      ],
    }))
  }

  return (
    <section className="grid h-full min-h-0 grid-cols-1 grid-rows-[minmax(0,1fr)_auto] gap-4 overflow-hidden bg-background p-4 md:grid-cols-[16rem_minmax(0,1fr)] md:grid-rows-[minmax(0,1fr)_auto]">
      <ConversationHistory
        activeConversationId={activeConversationId}
        conversations={conversationList}
        onDeleteConversation={handleDeleteConversation}
        onNewConversation={handleNewConversation}
        onSelectConversation={setActiveConversationId}
        onTogglePin={handleTogglePin}
        pinnedConversationId={pinnedConversationId}
      />

      <ChatConversation
        conversationTitle={activeConversation?.title ?? '新对话'}
        messages={activeMessages}
        onPromptSelect={handleSendMessage}
      />

      <ChatInput onSubmit={handleSendMessage} />
    </section>
  )
}
