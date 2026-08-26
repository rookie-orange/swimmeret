import { useEffect, useRef, useState } from 'react'
import { Link, Outlet, useNavigate } from '@tanstack/react-router'
import {
  AiSparklesIcon,
  Clock01Icon,
  Logout01Icon,
  PlusSignIcon,
  Settings01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { Button } from '@/components/ui/button'
import { logout } from '@/lib/auth'
import { cn } from '@/lib/utils'

const menuItems = [
  { label: '新建对话', to: '/', icon: PlusSignIcon },
  { label: '历史记录', to: '/history', icon: Clock01Icon },
  { label: '设置', to: '/settings', icon: Settings01Icon },
] as const

export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!menuOpen) {
      return
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [menuOpen])

  const handleLogout = () => {
    logout()
    setMenuOpen(false)
    void navigate({ to: '/login' })
  }

  return (
    <main className="relative flex h-screen min-h-0 overflow-hidden bg-background text-foreground">
      <div className="relative z-50" ref={menuRef}>
        <Button
          aria-expanded={menuOpen}
          aria-label={menuOpen ? '收起菜单' : '展开菜单'}
          className="absolute top-6 left-6 rounded-full shadow-sm"
          onClick={() => setMenuOpen((current) => !current)}
          size="icon-lg"
          variant={menuOpen ? 'secondary' : 'default'}
        >
          <HugeiconsIcon icon={AiSparklesIcon} strokeWidth={1.8} />
        </Button>

        <div
          className={cn(
            'absolute top-20 left-6 w-64 origin-top-left rounded-2xl border border-border bg-card/95 p-2 shadow-xl backdrop-blur-md transition-all duration-200',
            menuOpen
              ? 'translate-y-0 scale-100 opacity-100'
              : 'pointer-events-none -translate-y-2 scale-95 opacity-0',
          )}
        >
          <div className="px-3 py-3">
            <p className="text-sm font-semibold tracking-tight">swimmeret</p>
            <p className="mt-1 text-xs text-muted-foreground">你的 AI 工作台</p>
          </div>
          <div className="flex flex-col gap-1">
            {menuItems.map((item) => (
              <Link
                activeProps={{ className: 'bg-secondary text-foreground' }}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                key={item.to}
                onClick={() => setMenuOpen(false)}
                to={item.to}
              >
                <HugeiconsIcon icon={item.icon} size={18} strokeWidth={1.8} />
                <span>{item.label}</span>
              </Link>
            ))}
            <Button
              className="justify-start gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:text-destructive"
              onClick={handleLogout}
              variant="ghost"
            >
              <HugeiconsIcon icon={Logout01Icon} size={18} strokeWidth={1.8} />
              <span>退出登录</span>
            </Button>
          </div>
        </div>
      </div>

      <Outlet />
    </main>
  )
}
