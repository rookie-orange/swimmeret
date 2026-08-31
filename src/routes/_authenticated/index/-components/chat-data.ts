export type Conversation = {
  id: string
  title: string
}

export type ChatMessage = {
  id: string
  role: 'assistant' | 'user'
  content: string
}

export const conversations: Array<Conversation> = [
  { id: 'spring-launch', title: '春日上新海报' },
  { id: 'brand-direction', title: '品牌视觉方向探索' },
  { id: 'cafe-copy', title: '咖啡店开业文案' },
]

export const starterPrompts = [
  '为咖啡新品做一张清爽的春日海报',
  '把这张产品图拆成可编辑的图层',
  '给我三个不同风格的视觉方向',
  '写一段适合社交媒体的发布文案',
] as const

export const initialMessages: Record<string, Array<ChatMessage>> = {
  'spring-launch': [
    {
      id: 'spring-launch-welcome',
      role: 'assistant',
      content:
        '你好，我是 swimmeret。\n\n从一句想法开始，我可以帮你生成图片、拆解素材，或者直接搭一张海报草稿。',
    },
  ],
  'brand-direction': [
    {
      id: 'brand-direction-welcome',
      role: 'assistant',
      content: '告诉我你正在探索的品牌方向，我会帮你整理成清晰的视觉路线。',
    },
  ],
  'cafe-copy': [
    {
      id: 'cafe-copy-welcome',
      role: 'assistant',
      content: '把店铺气质和想传达的感觉交给我，一起写出有记忆点的开业文案。',
    },
  ],
}
