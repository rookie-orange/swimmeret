import { useState } from 'react'
import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import {
  AiImageEditIcon,
  AiVideoIcon,
  ChatIcon,
  Folder01Icon,
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

type WorkspaceId = 'chat' | 'image-editor' | 'video' | 'history'

const workspaces = [
  { id: 'chat', label: '对话', to: '/', icon: ChatIcon },
  {
    id: 'image-editor',
    label: '图片编辑',
    to: '/image-editor',
    icon: AiImageEditIcon,
  },
  { id: 'video', label: '视频生成', icon: AiVideoIcon },
  { id: 'history', label: '资源管理', to: '/history', icon: Folder01Icon },
] as const

function getWorkspace(pathname: string): WorkspaceId {
  if (pathname.startsWith('/image-editor')) return 'image-editor'
  if (pathname.startsWith('/history')) return 'history'
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
  disabled?: boolean
  icon: typeof ChatIcon
  label: string
  to?: string
}) {
  const className = cn(
    'inline-flex size-11 shrink-0 items-center justify-center rounded-2xl text-muted-foreground transition-all duration-200 outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none',
    active &&
      'bg-primary text-primary-foreground shadow-sm hover:bg-primary/80',
  )

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          to ? (
            <Link
              aria-current={active ? 'page' : undefined}
              aria-label={label}
              className={className}
              to={to}
            >
              <HugeiconsIcon icon={icon} />
            </Link>
          ) : (
            <Button
              aria-current={active ? 'page' : undefined}
              aria-label={disabled ? `${label}，即将推出` : label}
              disabled={disabled}
              size="icon"
              variant={active ? 'default' : 'ghost'}
            >
              <HugeiconsIcon icon={icon} />
            </Button>
          )
        }
      />
      <TooltipContent side="right">
        {disabled ? `${label} · 即将推出` : label}
      </TooltipContent>
    </Tooltip>
  )
}

export function WorkspaceCapsule() {
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
    <aside className="pointer-events-none fixed inset-y-0 left-0 z-40 flex w-20 flex-col items-center px-3 py-4">
      <div className="pointer-events-auto flex size-14 items-center justify-center rounded-full border border-border bg-card/90 p-1.5 shadow-xl shadow-foreground/10 backdrop-blur-xl">
        <DropdownMenu onOpenChange={setAccountMenuOpen} open={accountMenuOpen}>
          <DropdownMenuTrigger
            render={
              <Button
                aria-label="打开账户菜单"
                className="size-11 rounded-full p-0 ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                size="icon"
                type="button"
                variant="ghost"
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
                <HugeiconsIcon icon={Logout01Icon} strokeWidth={1.8} />
                退出登录
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="pointer-events-auto mt-3 flex w-14 flex-col items-center gap-1 rounded-[1.75rem] border border-border bg-card/90 p-1.5 shadow-xl shadow-foreground/10 backdrop-blur-xl">
        <nav aria-label="主导航" className="flex flex-col items-center gap-1">
          {workspaces.map((item) => (
            <NavItem
              active={workspace === item.id}
              disabled={item.id === 'video'}
              icon={item.icon}
              key={item.id}
              label={item.label}
              to={'to' in item ? item.to : undefined}
            />
          ))}
        </nav>
      </div>

      <div className="pointer-events-auto mt-auto flex size-14 items-center justify-center rounded-full border border-border bg-card/90 p-1.5 shadow-xl shadow-foreground/10 backdrop-blur-xl">
        <Tooltip>
          <TooltipTrigger
            render={
              <Link
                aria-label="设置"
                className={cn(
                  'inline-flex size-11 items-center justify-center rounded-2xl text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50',
                  location.pathname.startsWith('/settings') &&
                    'bg-secondary text-secondary-foreground',
                )}
                to="/settings"
              >
                <HugeiconsIcon icon={Settings01Icon} strokeWidth={1.8} />
              </Link>
            }
          />
          <TooltipContent side="right">设置</TooltipContent>
        </Tooltip>
      </div>
    </aside>
  )
}
