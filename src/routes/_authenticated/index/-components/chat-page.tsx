import { useState } from 'react'
import {
  Add01Icon,
  Delete01Icon,
  MoreHorizontalIcon,
  PencilEdit01Icon,
  PinIcon,
  PinOffIcon,
  Share01Icon,
  SparklesIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

import { ChatDock } from './chat-dock'

const conversations = [
  '春日上新海报',
  '品牌视觉方向探索',
  '咖啡店开业文案',
] as const

const starterPrompts = [
  '为咖啡新品做一张清爽的春日海报',
  '把这张产品图拆成可编辑的图层',
  '给我三个不同风格的视觉方向',
  '写一段适合社交媒体的发布文案',
] as const

export function ChatPage() {
  const [activeConversation, setActiveConversation] = useState(0)
  const [pinnedConversation, setPinnedConversation] = useState<number | null>(
    null,
  )
  const [conversationList, setConversationList] = useState([...conversations])

  return (
    <section className="grid h-full min-h-0 grid-cols-1 grid-rows-[minmax(0,1fr)_auto] gap-4 overflow-hidden bg-background p-4 md:grid-cols-[16rem_minmax(0,1fr)] md:grid-rows-[minmax(0,1fr)_auto]">
      <aside className="col-start-1 row-start-1 hidden min-h-0 flex-col gap-4 overflow-hidden rounded-3xl border border-border bg-card/95 p-2 shadow-xl shadow-foreground/5 backdrop-blur-xl md:flex">
        <div className="flex items-center px-2 pt-1">
          <h1 className="text-lg font-semibold tracking-tight">聊天</h1>
        </div>
        <Button
          className="w-full justify-start gap-2 rounded-2xl"
          variant="default"
        >
          <HugeiconsIcon icon={Add01Icon} data-icon="inline-start" />
          新建对话
        </Button>

        <Input aria-label="搜索历史记录" placeholder="搜索对话" />
        <div className="flex items-center gap-2 px-2 text-sm tracking-wide text-muted-foreground uppercase">
          最近对话
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
          {conversationList.map((title, index) => (
            <div
              className={cn(
                'group flex min-h-10 w-full items-center gap-1 rounded-2xl px-2 transition-colors hover:bg-secondary',
                activeConversation === index && 'bg-secondary',
              )}
              key={title}
            >
              <Button
                className="min-w-0 flex-1 justify-start rounded-xl px-2 text-left font-normal"
                onClick={() => setActiveConversation(index)}
                variant="ghost"
              >
                <span className="block truncate text-sm">{title}</span>
              </Button>
              <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        aria-label={
                          pinnedConversation === index ? '取消置顶' : '置顶聊天'
                        }
                        className={cn(
                          'size-8 rounded-full text-muted-foreground',
                          pinnedConversation === index &&
                            'bg-primary/15 text-primary opacity-100',
                        )}
                        onClick={() =>
                          setPinnedConversation((current) =>
                            current === index ? null : index,
                          )
                        }
                        size="icon-sm"
                        variant="ghost"
                      />
                    }
                  >
                    <HugeiconsIcon
                      icon={pinnedConversation === index ? PinOffIcon : PinIcon}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    {pinnedConversation === index ? '取消置顶' : '置顶聊天'}
                  </TooltipContent>
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
                  <DropdownMenuContent
                    align="start"
                    side="right"
                    sideOffset={8}
                  >
                    <DropdownMenuGroup>
                      <DropdownMenuItem disabled>
                        <HugeiconsIcon icon={Share01Icon} />
                        分享
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <HugeiconsIcon icon={PencilEdit01Icon} />
                        重命名
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() =>
                          setPinnedConversation((current) =>
                            current === index ? null : index,
                          )
                        }
                      >
                        <HugeiconsIcon
                          icon={
                            pinnedConversation === index ? PinOffIcon : PinIcon
                          }
                        />
                        {pinnedConversation === index ? '取消置顶' : '置顶聊天'}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => {
                          setConversationList((current) =>
                            current.filter(
                              (_, itemIndex) => itemIndex !== index,
                            ),
                          )
                          setActiveConversation((current) =>
                            current >= index
                              ? Math.max(0, current - 1)
                              : current,
                          )
                          setPinnedConversation((current) => {
                            if (current === index) return null
                            if (current !== null && current > index) {
                              return current - 1
                            }
                            return current
                          })
                        }}
                      >
                        <HugeiconsIcon icon={Delete01Icon} />
                        删除
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      </aside>

      <div className="col-start-1 row-start-1 flex min-h-0 min-w-0 flex-col overflow-y-auto px-1 py-4 sm:px-4 md:col-start-2 md:px-4 md:py-6">
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-8">
          <div className="flex items-start gap-4">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <HugeiconsIcon icon={SparklesIcon} />
            </div>
            <div className="max-w-xl pt-1">
              <p className="text-sm font-medium">你好，我是 swimmeret。</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                从一句想法开始，我可以帮你生成图片、拆解素材，或者直接搭一张海报草稿。
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {starterPrompts.map((prompt) => (
              <Button
                className="h-auto justify-start gap-3 rounded-2xl border border-border bg-card/60 px-4 py-3 text-left font-normal text-muted-foreground hover:border-primary/40 hover:bg-secondary hover:text-foreground"
                key={prompt}
                variant="ghost"
              >
                <HugeiconsIcon
                  icon={SparklesIcon}
                  className="shrink-0 text-primary"
                />
                <span>{prompt}</span>
              </Button>
            ))}
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full bg-primary" />
            当前对话：{conversationList[activeConversation] ?? '新对话'}
          </div>
        </div>
      </div>

      <ChatDock />
    </section>
  )
}
