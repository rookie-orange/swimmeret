import { useState } from 'react'
import { useLocation, useNavigate } from '@tanstack/react-router'
import {
  AiImageEditIcon,
  AiVideoIcon,
  ChatIcon,
  Folder01Icon,
  ImageIcon,
  Logout01Icon,
  Settings01Icon,
  UserIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { logout } from '@/lib/auth'

type WorkspaceId =
  | 'chat'
  | 'image-editor'
  | 'video'
  | 'history'
  | 'raw-layer-test'

const workspaces = [
  { id: 'chat', label: '对话', to: '/', icon: ChatIcon, disabled: false },
  {
    id: 'image-editor',
    label: '图片编辑',
    to: '/image-editor',
    icon: AiImageEditIcon,
    disabled: false,
  },
  {
    id: 'video',
    label: '视频生成',
    to: undefined,
    icon: AiVideoIcon,
    disabled: true,
  },
  {
    id: 'history',
    label: '资源管理',
    to: '/history',
    icon: Folder01Icon,
    disabled: false,
  },
  {
    id: 'raw-layer-test',
    label: '原图测试',
    to: '/raw-layer-test',
    icon: ImageIcon,
    disabled: false,
  },
] as const

function getWorkspace(pathname: string): WorkspaceId {
  if (pathname.startsWith('/image-editor')) return 'image-editor'
  if (pathname.startsWith('/history')) return 'history'
  if (pathname.startsWith('/raw-layer-test')) return 'raw-layer-test'
  return 'chat'
}

function NavItem({
  active,
  disabled,
  icon,
  label,
  to,
}: {
  active: boolean
  disabled: boolean
  icon: typeof ChatIcon
  label: string
  to: '/' | '/image-editor' | '/history' | '/raw-layer-test' | undefined
}) {
  const navigate = useNavigate()

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            aria-current={active ? 'page' : undefined}
            aria-label={disabled ? `${label}，即将推出` : label}
            disabled={disabled}
            onClick={() => {
              if (to) void navigate({ to })
            }}
            className={cn(
              'transition-all duration-200 motion-reduce:transition-none',
            )}
            size="icon-lg"
            variant={active ? 'default' : 'ghost'}
          >
            <HugeiconsIcon icon={icon} />
          </Button>
        }
      />
      <TooltipContent side="right">
        {disabled ? `${label} · 即将推出` : label}
      </TooltipContent>
    </Tooltip>
  )
}

type WorkspaceCapsuleProps = {
  className?: string
}

export function WorkspaceCapsule({ className }: WorkspaceCapsuleProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const workspace = getWorkspace(location.pathname)

  const handleLogout = () => {
    logout()
    setAccountMenuOpen(false)
    void navigate({ to: '/login' })
  }

  return (
    <aside className={className}>
      <div className="pointer-events-auto flex items-center justify-center rounded-full border border-border bg-card/90 p-2 shadow-xl shadow-foreground/10 backdrop-blur-xl">
        <DropdownMenu onOpenChange={setAccountMenuOpen} open={accountMenuOpen}>
          <DropdownMenuTrigger
            render={
              <Button
                aria-label="打开账户菜单"
                size="icon-lg"
                type="button"
                variant="default"
              />
            }
          >
            <Avatar>
              <AvatarFallback className="bg-primary text-primary-foreground">
                <HugeiconsIcon icon={UserIcon} />
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-64 p-2"
            side="right"
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
              <DropdownMenuItem onClick={handleLogout} variant="destructive">
                <HugeiconsIcon icon={Logout01Icon} />
                退出登录
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="pointer-events-auto mt-3 flex w-14 flex-col items-center rounded-full border border-border bg-card/90 p-2 shadow-xl shadow-foreground/10 backdrop-blur-xl">
        <nav aria-label="主导航" className="flex flex-col items-center gap-1">
          {workspaces.map((item) => (
            <NavItem
              active={workspace === item.id}
              disabled={item.disabled}
              icon={item.icon}
              key={item.id}
              label={item.label}
              to={item.to}
            />
          ))}
        </nav>
      </div>

      <div className="pointer-events-auto mt-auto flex size-14 items-center justify-center rounded-full border border-border bg-card/90 p-1.5 shadow-xl shadow-foreground/10 backdrop-blur-xl">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                aria-label="设置"
                className={cn(
                  'size-11 rounded-2xl transition-colors motion-reduce:transition-none',
                  !location.pathname.startsWith('/settings') &&
                    'text-muted-foreground',
                )}
                onClick={() => void navigate({ to: '/settings' })}
                size="icon"
                type="button"
                variant={
                  location.pathname.startsWith('/settings')
                    ? 'secondary'
                    : 'ghost'
                }
              >
                <HugeiconsIcon icon={Settings01Icon} />
              </Button>
            }
          />
          <TooltipContent side="right">设置</TooltipContent>
        </Tooltip>
      </div>
    </aside>
  )
}
