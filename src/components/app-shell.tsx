import { useLayoutEffect, useRef, useState } from 'react'
import { Outlet } from '@tanstack/react-router'
import gsap from 'gsap'

import { WorkspaceCapsule } from '@/components/workspace-capsule'
import { LOGIN_REVEAL_STORAGE_KEY } from '@/lib/auth'

export function AppShell() {
  const [shouldReveal, setShouldReveal] = useState(() => {
    if (typeof window === 'undefined') return false

    try {
      return (
        window.sessionStorage.getItem(LOGIN_REVEAL_STORAGE_KEY) === 'pending'
      )
    } catch {
      return false
    }
  })
  const topCurtainRef = useRef<HTMLDivElement>(null)
  const bottomCurtainRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!shouldReveal) return

    try {
      window.sessionStorage.removeItem(LOGIN_REVEAL_STORAGE_KEY)
    } catch {
      // Ignore storage failures; the current route remains usable.
    }

    const topCurtain = topCurtainRef.current
    const bottomCurtain = bottomCurtainRef.current

    if (!topCurtain || !bottomCurtain) {
      queueMicrotask(() => setShouldReveal(false))
      return
    }

    const revealTimeline = gsap.timeline({
      onComplete: () => setShouldReveal(false),
    })
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      revealTimeline
        .set(topCurtain, { yPercent: -100 }, 0)
        .set(bottomCurtain, { yPercent: 100 }, 0)
    } else {
      revealTimeline
        .to(
          topCurtain,
          {
            yPercent: -100,
            duration: 0.8,
            ease: 'power3.inOut',
          },
          0,
        )
        .to(
          bottomCurtain,
          {
            yPercent: 100,
            duration: 0.8,
            ease: 'power3.inOut',
          },
          0,
        )
    }

    return () => {
      revealTimeline.kill()
    }
  }, [shouldReveal])

  return (
    <div className="relative grid h-full min-h-0 grid-cols-[5rem_minmax(0,1fr)] overflow-hidden text-foreground sm:grid-cols-[5.5rem_minmax(0,1fr)]">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-10 select-none"
        data-tauri-drag-region
      />
      <div className="min-h-0 p-4">
        <WorkspaceCapsule className="flex h-full min-h-0 w-full flex-col items-center pt-4" />
      </div>
      <div className="min-h-0 min-w-0 overflow-hidden bg-card">
        <Outlet />
      </div>
      {shouldReveal && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-50 flex flex-col"
        >
          <div className="min-h-0 flex-1 bg-primary" ref={topCurtainRef} />
          <div className="min-h-0 flex-1 bg-primary" ref={bottomCurtainRef} />
        </div>
      )}
    </div>
  )
}
