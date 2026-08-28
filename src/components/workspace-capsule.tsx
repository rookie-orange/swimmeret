import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import {
  AiImageEditIcon,
  AiSparklesIcon,
  AiVideoIcon,
  ArrowUp02Icon,
  Attachment01Icon,
  ChatIcon,
  CursorPointer01Icon,
  HandIcon,
  ImageAdd01Icon,
  Logout01Icon,
  MoreHorizontalIcon,
  MultiplicationSignIcon,
  PencilEdit01Icon,
  Settings01Icon,
  ShapesIcon,
  TextIcon,
  UserIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { AutoWidth } from '@/components/auto-width'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { logout } from '@/lib/auth'

type WorkspaceId = 'chat' | 'image-editor' | 'video'

const workspaces = [
  { id: 'chat', label: '聊天', to: '/', icon: ChatIcon },
  {
    id: 'image-editor',
    label: '图片编辑',
    to: '/image-editor',
    icon: AiImageEditIcon,
  },
  { id: 'video', label: '视频生成', icon: AiVideoIcon },
] as const

const imageTools = [
  { label: '选择', icon: CursorPointer01Icon },
  { label: '抓手', icon: HandIcon },
  { label: '钢笔', icon: PencilEdit01Icon },
  { label: '文字', icon: TextIcon },
  { label: '形状', icon: ShapesIcon },
  { label: '素材', icon: ImageAdd01Icon },
  { label: 'AI 助手', icon: AiSparklesIcon },
] as const

function getWorkspace(pathname: string): WorkspaceId {
  if (pathname.startsWith('/image-editor')) return 'image-editor'
  return 'chat'
}

export function WorkspaceCapsule() {
  const location = useLocation()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [activeTool, setActiveTool] = useState('选择')
  const workspace = getWorkspace(location.pathname)
  const isChatPage = location.pathname === '/'
  const workspaceMeta = workspaces.find((item) => item.id === workspace)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!message.trim()) return
    setMessage('')
  }

  const handleLogout = () => {
    logout()
    setAccountMenuOpen(false)
    void navigate({ to: '/login' })
  }

  return (
    <div
      className={cn(
        'pointer-events-none fixed inset-x-0 bottom-5 z-40 flex h-14 justify-center px-4 transition-transform duration-500 ease-out motion-reduce:transition-none sm:bottom-7',
        isChatPage && 'lg:translate-x-40',
      )}
    >
      <div className="relative flex h-14 max-w-full items-center gap-2">
        <div className="pointer-events-auto flex size-14 shrink-0 items-center justify-center rounded-full border border-border bg-card/95 p-1.5 shadow-2xl shadow-foreground/10 backdrop-blur-xl">
          <Tooltip>
            <DropdownMenu onOpenChange={setMenuOpen} open={menuOpen}>
              <DropdownMenuTrigger
                render={
                  <TooltipTrigger
                    render={
                      <Button
                        aria-label={menuOpen ? '关闭工作区菜单' : '切换工作区'}
                        className="size-10 rounded-full"
                        size="icon-lg"
                        type="button"
                      />
                    }
                  />
                }
              >
                <HugeiconsIcon
                  className={cn(
                    'transition-transform duration-200 ease-out motion-reduce:transition-none size-5',
                    menuOpen && 'rotate-90',
                  )}
                  icon={
                    menuOpen
                      ? MultiplicationSignIcon
                      : (workspaceMeta?.icon ?? ChatIcon)
                  }
                />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-72 p-2"
                side="top"
                sideOffset={12}
              >
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="flex items-center justify-between">
                    工作区
                    <HugeiconsIcon
                      icon={AiSparklesIcon}
                      className="text-primary"
                    />
                  </DropdownMenuLabel>
                  {workspaces.map((item) =>
                    item.id === 'video' ? (
                      <DropdownMenuItem disabled key={item.id}>
                        <span className="flex size-9 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                          <HugeiconsIcon icon={item.icon} />
                        </span>
                        <span className="flex min-w-0 flex-col items-start gap-0.5">
                          <span>{item.label}</span>
                          <span className="text-xs font-normal text-muted-foreground">
                            即将推出
                          </span>
                        </span>
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        className={cn(
                          'h-auto gap-3 py-3 text-muted-foreground',
                          workspace === item.id &&
                            'bg-accent text-accent-foreground',
                        )}
                        key={item.id}
                        onClick={() => setMenuOpen(false)}
                        render={<Link to={item.to} />}
                      >
                        <span className="flex size-9 items-center justify-center rounded-xl bg-muted">
                          <HugeiconsIcon icon={item.icon} />
                        </span>
                        <span>{item.label}</span>
                      </DropdownMenuItem>
                    ),
                  )}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <TooltipContent>
              {menuOpen ? '关闭工作区菜单' : '切换工作区'}
            </TooltipContent>
          </Tooltip>
        </div>

        <AutoWidth className="pointer-events-auto h-14 shrink-0 rounded-[28px] border border-border bg-card/95 p-1.5 shadow-2xl shadow-foreground/10 backdrop-blur-xl">
          {workspace === 'chat' ? (
            <form
              className="flex h-10 w-2xl max-w-[calc(100vw-11rem)] items-center gap-1"
              onSubmit={handleSubmit}
            >
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      aria-label="添加附件"
                      className="shrink-0 rounded-full text-muted-foreground"
                      size="icon"
                      type="button"
                      variant="ghost"
                    />
                  }
                >
                  <HugeiconsIcon icon={Attachment01Icon} />
                </TooltipTrigger>
                <TooltipContent>添加参考图</TooltipContent>
              </Tooltip>
              <Input
                aria-label="输入消息"
                className="h-10 min-w-0 flex-1 rounded-full border-0 bg-transparent px-3 shadow-none focus-visible:ring-0"
                onChange={(event) => setMessage(event.currentTarget.value)}
                placeholder="描述一个想法，开始创作……"
                value={message}
              />
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      aria-label="发送消息"
                      className="shrink-0 rounded-full"
                      size="icon-lg"
                      type="submit"
                    />
                  }
                >
                  <HugeiconsIcon icon={ArrowUp02Icon} />
                </TooltipTrigger>
                <TooltipContent>发送消息</TooltipContent>
              </Tooltip>
            </form>
          ) : (
            <div className="flex h-10 w-max max-w-[calc(100vw-11rem)] items-center gap-0.5 overflow-x-auto px-1 scrollbar-none [&::-webkit-scrollbar]:hidden">
              {imageTools.map((tool, index) => (
                <Tooltip key={tool.label}>
                  <TooltipTrigger
                    render={
                      <Button
                        aria-label={tool.label}
                        aria-pressed={activeTool === tool.label}
                        className={cn(
                          'size-10 shrink-0 rounded-full text-muted-foreground transition-all duration-200 motion-reduce:transition-none',
                          index === imageTools.length - 1 &&
                            'text-primary hover:text-primary',
                        )}
                        onClick={() => setActiveTool(tool.label)}
                        size="icon"
                        variant={
                          activeTool === tool.label ? 'secondary' : 'ghost'
                        }
                      />
                    }
                  >
                    <HugeiconsIcon icon={tool.icon} />
                  </TooltipTrigger>
                  <TooltipContent>{tool.label}</TooltipContent>
                </Tooltip>
              ))}
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      aria-label="更多工具"
                      className="size-10 shrink-0 rounded-full text-muted-foreground"
                      size="icon"
                      variant="ghost"
                    />
                  }
                >
                  <HugeiconsIcon icon={MoreHorizontalIcon} />
                </TooltipTrigger>
                <TooltipContent>更多工具</TooltipContent>
              </Tooltip>
            </div>
          )}
        </AutoWidth>

        <div className="pointer-events-auto flex size-14 shrink-0 items-center justify-center rounded-full border border-border bg-card/95 p-1.5 shadow-2xl shadow-foreground/10 backdrop-blur-xl">
          <Tooltip>
            <DropdownMenu
              onOpenChange={setAccountMenuOpen}
              open={accountMenuOpen}
            >
              <DropdownMenuTrigger
                render={
                  <TooltipTrigger
                    render={
                      <Button
                        aria-label={
                          accountMenuOpen ? '关闭账户菜单' : '打开账户菜单'
                        }
                        className="size-10 rounded-full p-0"
                        size="icon-lg"
                        type="button"
                        variant="ghost"
                      />
                    }
                  />
                }
              >
                <Avatar size="lg">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    <HugeiconsIcon icon={UserIcon} strokeWidth={1.8} />
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-64 p-2"
                side="top"
                sideOffset={12}
              >
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="flex items-center gap-3 px-3 py-3">
                    <Avatar size="lg">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        <HugeiconsIcon icon={UserIcon} strokeWidth={1.8} />
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-sm font-medium text-foreground">
                        swimmeret
                      </span>
                      <span className="text-xs font-normal text-muted-foreground">
                        当前已登录
                      </span>
                    </span>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem render={<Link to="/settings" />}>
                    <HugeiconsIcon icon={Settings01Icon} strokeWidth={1.8} />
                    设置
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleLogout}
                    variant="destructive"
                  >
                    <HugeiconsIcon icon={Logout01Icon} strokeWidth={1.8} />
                    退出登录
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <TooltipContent>
              {accountMenuOpen ? '关闭账户菜单' : '账户'}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  )
}
