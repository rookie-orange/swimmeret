import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useReducedMotion,
} from 'motion/react'
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
  PencilEdit01Icon,
  Settings01Icon,
  ShapesIcon,
  TextIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { Button } from '@/components/ui/button'
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

const capsuleSpring = {
  type: 'spring' as const,
  stiffness: 320,
  damping: 30,
  mass: 0.75,
}

function getWorkspace(pathname: string): WorkspaceId {
  if (pathname.startsWith('/image-editor')) return 'image-editor'
  return 'chat'
}

export function WorkspaceCapsule() {
  const location = useLocation()
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()
  const [menuOpen, setMenuOpen] = useState(false)
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
    setMenuOpen(false)
    void navigate({ to: '/login' })
  }

  return (
    <LayoutGroup id="workspace-capsule">
      <motion.div
        layout
        transition={reduceMotion ? { duration: 0 } : capsuleSpring}
        className={cn(
          'pointer-events-none fixed inset-x-0 bottom-5 z-40 flex justify-center px-4 sm:bottom-7',
          isChatPage && 'lg:pl-80',
        )}
      >
        <div
          className={cn(
            'relative max-w-full',
            workspace === 'chat' ? 'w-full max-w-2xl' : 'w-fit',
          )}
        >
          <motion.div
            layout
            transition={reduceMotion ? { duration: 0 } : capsuleSpring}
            className={cn(
              'pointer-events-auto flex min-h-14 items-center gap-1 rounded-[28px] border border-border bg-card/95 p-1.5 shadow-2xl shadow-foreground/10 backdrop-blur-xl',
              workspace === 'chat' ? 'w-full' : 'w-fit max-w-full',
            )}
          >
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    aria-expanded={menuOpen}
                    aria-label="切换工作区"
                    className={cn(
                      'rounded-full transition-transform duration-300 motion-reduce:transition-none',
                      menuOpen && 'rotate-12',
                    )}
                    onClick={() => setMenuOpen((current) => !current)}
                    size="icon-lg"
                    variant={menuOpen ? 'secondary' : 'default'}
                  />
                }
              >
                <HugeiconsIcon icon={workspaceMeta?.icon ?? ChatIcon} />
              </TooltipTrigger>
              <TooltipContent>切换工作区</TooltipContent>
            </Tooltip>

            <div className="flex min-w-0 flex-1 items-center overflow-hidden">
              <AnimatePresence initial={false} mode="wait">
                {workspace === 'chat' ? (
                  <motion.form
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    className="flex min-w-0 flex-1 items-center gap-1"
                    exit={{ opacity: 0, scale: 0.96, x: -12 }}
                    initial={{ opacity: 0, scale: 0.96, x: 12 }}
                    key="chat-controls"
                    onSubmit={handleSubmit}
                    transition={
                      reduceMotion
                        ? { duration: 0 }
                        : { duration: 0.2, ease: 'easeOut' }
                    }
                  >
                    <Input
                      aria-label="输入消息"
                      className="h-10 min-w-0 flex-1 rounded-full border-0 bg-transparent px-3 shadow-none focus-visible:ring-0"
                      onChange={(event) =>
                        setMessage(event.currentTarget.value)
                      }
                      placeholder="描述一个想法，开始创作……"
                      value={message}
                    />
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            aria-label="添加附件"
                            className="rounded-full text-muted-foreground"
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
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            aria-label="发送消息"
                            className="rounded-full"
                            size="icon-lg"
                            type="submit"
                          />
                        }
                      >
                        <HugeiconsIcon icon={ArrowUp02Icon} />
                      </TooltipTrigger>
                      <TooltipContent>发送消息</TooltipContent>
                    </Tooltip>
                  </motion.form>
                ) : (
                  <motion.div
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto px-1 scrollbar-none [&::-webkit-scrollbar]:hidden"
                    exit={{ opacity: 0, scale: 0.96, x: 12 }}
                    initial={{ opacity: 0, scale: 0.96, x: -12 }}
                    key="image-editor-controls"
                    transition={
                      reduceMotion
                        ? { duration: 0 }
                        : { duration: 0.2, ease: 'easeOut' }
                    }
                  >
                    {imageTools.map((tool, index) => (
                      <Tooltip key={tool.label}>
                        <TooltipTrigger
                          render={
                            <Button
                              aria-label={tool.label}
                              aria-pressed={activeTool === tool.label}
                              className={cn(
                                'size-10 rounded-full text-muted-foreground transition-all duration-200 motion-reduce:transition-none',
                                activeTool === tool.label &&
                                  'bg-secondary text-foreground shadow-sm',
                                index === imageTools.length - 1 &&
                                  'text-primary hover:text-primary',
                              )}
                              onClick={() => setActiveTool(tool.label)}
                              size="icon"
                              variant="ghost"
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
                            className="size-10 rounded-full text-muted-foreground"
                            size="icon"
                            variant="ghost"
                          />
                        }
                      >
                        <HugeiconsIcon icon={MoreHorizontalIcon} />
                      </TooltipTrigger>
                      <TooltipContent>更多工具</TooltipContent>
                    </Tooltip>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          <AnimatePresence>
            {menuOpen ? (
              <motion.div
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="pointer-events-auto absolute right-0 bottom-full left-0 mb-3 origin-bottom rounded-3xl border border-border bg-card/95 p-2 shadow-2xl shadow-foreground/10 backdrop-blur-xl"
                exit={{ opacity: 0, scale: 0.96, y: 8 }}
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { duration: 0.18, ease: 'easeOut' }
                }
              >
                <div className="flex items-center justify-between px-3 py-2">
                  <div>
                    <p className="text-sm font-semibold">工作区</p>
                  </div>
                  <HugeiconsIcon
                    icon={AiSparklesIcon}
                    className="text-primary"
                  />
                </div>
                <div className="grid gap-1 sm:grid-cols-3">
                  {workspaces.map((item) =>
                    item.id === 'video' ? (
                      <Button
                        aria-label={`${item.label}暂不可用`}
                        className="h-auto justify-start gap-3 rounded-2xl px-3 py-3 text-left"
                        disabled
                        key={item.id}
                        variant="ghost"
                      >
                        <span className="flex size-9 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                          <HugeiconsIcon icon={item.icon} />
                        </span>
                        <span className="flex min-w-0 flex-col items-start gap-0.5">
                          <span className="text-sm">{item.label}</span>
                          <span className="text-[11px] font-normal text-muted-foreground">
                            即将推出
                          </span>
                        </span>
                      </Button>
                    ) : (
                      <Link
                        className={cn(
                          'flex items-center gap-3 rounded-2xl px-3 py-3 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground',
                          workspace === item.id &&
                            'bg-secondary text-foreground',
                        )}
                        key={item.id}
                        onClick={() => setMenuOpen(false)}
                        to={item.to}
                      >
                        <span className="flex size-9 items-center justify-center rounded-xl bg-muted">
                          <HugeiconsIcon icon={item.icon} />
                        </span>
                        <span>{item.label}</span>
                      </Link>
                    ),
                  )}
                </div>
                <div className="my-2 h-px bg-border" />
                <div className="flex items-center gap-1">
                  <Link
                    className="flex flex-1 items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    onClick={() => setMenuOpen(false)}
                    to="/settings"
                  >
                    <HugeiconsIcon icon={Settings01Icon} strokeWidth={1.8} />
                    设置
                  </Link>
                  <Button
                    className="flex-1 justify-start gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:text-destructive"
                    onClick={handleLogout}
                    variant="ghost"
                  >
                    <HugeiconsIcon icon={Logout01Icon} strokeWidth={1.8} />
                    退出
                  </Button>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </motion.div>
    </LayoutGroup>
  )
}
