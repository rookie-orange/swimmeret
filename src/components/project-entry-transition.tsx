import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { flushSync } from 'react-dom'
import { useNavigate, useRouter } from '@tanstack/react-router'

interface Entry {
  direction: 'enter' | 'return'
  projectId: string | null
  animation?: Animation
  snapshotAnimation?: Animation
  settling?: boolean
  timeout?: ReturnType<typeof setTimeout>
}

interface ProjectListView {
  query: string
  scrollTop: number
}

interface ProjectEntryTransition {
  isEntering: boolean
  returningProjectId: string | null
  listView: ProjectListView
  rememberListView: (view: ProjectListView) => void
  enter: (
    source: HTMLElement,
    getProjectId: () => Promise<string>,
  ) => Promise<void>
  reveal: (projectId: string) => void
  finishReturn: (target: HTMLElement | null) => void
}

const ProjectEntryContext = createContext<ProjectEntryTransition | null>(null)

export function ProjectEntryTransitionProvider({
  children,
}: {
  children: ReactNode
}) {
  const navigate = useNavigate()
  const router = useRouter()
  const overlay = useRef<HTMLDivElement>(null)
  const content = useRef<HTMLDivElement>(null)
  const snapshot = useRef<HTMLDivElement>(null)
  const active = useRef<Entry | null>(null)
  const [isEntering, setIsEntering] = useState(false)
  const [returningProjectId, setReturningProjectId] = useState<string | null>(
    null,
  )
  const [listView, rememberListView] = useState<ProjectListView>({
    query: '',
    scrollTop: 0,
  })

  const clear = useCallback(() => {
    active.current?.animation?.cancel()
    active.current?.snapshotAnimation?.cancel()
    clearTimeout(active.current?.timeout)
    snapshot.current?.replaceChildren()
    active.current = null
    setIsEntering(false)
    setReturningProjectId(null)
  }, [])

  useEffect(() => {
    const unsubscribe = router.subscribe(
      'onBeforeNavigate',
      ({ fromLocation, toLocation }) => {
        const projectMatch = fromLocation?.pathname.match(
          /^\/image-editor\/([^/]+)\/?$/,
        )
        // Router emits this only after the editor's save blocker allows leaving.
        if (projectMatch && toLocation.pathname === '/image-editor') {
          clear()
          const entry: Entry = {
            direction: 'return',
            projectId: decodeURIComponent(projectMatch[1]),
          }
          const screen = content.current?.firstElementChild
          if (screen) {
            const clone = screen.cloneNode(true) as HTMLElement
            const canvases = screen.querySelectorAll('canvas')
            // DOM cloning omits bitmap pixels, including the editor's canvas overlays.
            clone.querySelectorAll('canvas').forEach((canvas, index) => {
              const source = canvases[index]
              if (source.width && source.height)
                canvas.getContext('2d')?.drawImage(source, 0, 0)
            })
            snapshot.current?.replaceChildren(clone)
          }
          active.current = entry
          setReturningProjectId(entry.projectId)
          setIsEntering(true)
          entry.timeout = setTimeout(() => {
            if (active.current === entry) clear()
          }, 10000)
          return
        }
        const entry = active.current
        const destination =
          entry?.direction === 'return'
            ? '/image-editor'
            : `/image-editor/${entry?.projectId}`
        if (entry && toLocation.pathname !== destination) clear()
      },
    )
    return () => {
      unsubscribe()
      active.current?.animation?.cancel()
      active.current?.snapshotAnimation?.cancel()
      clearTimeout(active.current?.timeout)
      active.current = null
    }
  }, [router, clear])

  const reveal = useCallback(
    (projectId: string) => {
      const entry = active.current
      const element = overlay.current
      if (
        !entry ||
        entry.direction !== 'enter' ||
        entry.settling ||
        entry.projectId !== projectId ||
        !element
      )
        return
      entry.settling = true
      clearTimeout(entry.timeout)
      entry.animation?.cancel()
      // Give the restored canvas a paint before uncovering it.
      entry.animation = element.animate([{ opacity: 1 }, { opacity: 0 }], {
        delay: 32,
        duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 0
          : 180,
        easing: 'ease-out',
        fill: 'forwards',
      })
      void entry.animation.finished
        .then(() => {
          // Hide in the same commit that removes the animation's transparent fill.
          if (active.current === entry) flushSync(clear)
        })
        .catch(() => {})
    },
    [clear],
  )

  const enter = useCallback(
    async (source: HTMLElement, getProjectId: () => Promise<string>) => {
      if (active.current) return
      const rect = source.getBoundingClientRect()
      const appearance = getComputedStyle(source)
      const backgroundColor = appearance.backgroundColor
      const radius = appearance.borderRadius
      const entry: Entry = { direction: 'enter', projectId: null }
      active.current = entry
      flushSync(() => setIsEntering(true))
      const element = overlay.current
      try {
        if (
          element &&
          !window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ) {
          entry.animation = element.animate(
            [
              {
                clipPath: `inset(${rect.top}px ${window.innerWidth - rect.right}px ${window.innerHeight - rect.bottom}px ${rect.left}px round ${radius})`,
                backgroundColor,
              },
              {
                clipPath: 'inset(0px round 0px)',
                backgroundColor: getComputedStyle(element).backgroundColor,
              },
            ],
            {
              duration: 520,
              easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
              fill: 'forwards',
            },
          )
          await entry.animation.finished
        }
        if (active.current !== entry) return
        entry.projectId = await getProjectId()
        if (active.current !== entry) return
        // A stalled load must eventually expose the editor's loading/error controls.
        entry.timeout = setTimeout(() => {
          if (active.current === entry) clear()
        }, 10000)
        await navigate({
          to: '/image-editor/$id',
          params: { id: entry.projectId },
        })
      } catch (error) {
        if (active.current !== entry) return
        clear()
        throw error
      }
    },
    [navigate, clear],
  )

  const finishReturn = useCallback(
    (target: HTMLElement | null) => {
      const entry = active.current
      const element = overlay.current
      if (!entry || entry.direction !== 'return' || entry.settling || !element)
        return
      entry.settling = true
      clearTimeout(entry.timeout)
      const reducedMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches
      const rect = target?.getBoundingClientRect()
      const appearance = target ? getComputedStyle(target) : null
      const duration = reducedMotion ? 0 : rect ? 520 : 180
      entry.animation = element.animate(
        rect && appearance
          ? [
              {
                clipPath: 'inset(0px round 0px)',
                backgroundColor: getComputedStyle(element).backgroundColor,
              },
              {
                clipPath: `inset(${rect.top}px ${window.innerWidth - rect.right}px ${window.innerHeight - rect.bottom}px ${rect.left}px round ${appearance.borderRadius})`,
                backgroundColor: appearance.backgroundColor,
              },
            ]
          : [{ opacity: 1 }, { opacity: 0 }],
        {
          duration,
          easing: 'cubic-bezier(0.65, 0, 0.35, 1)',
          fill: 'forwards',
        },
      )
      const preview = snapshot.current
      if (preview) {
        const scale = rect
          ? Math.max(
              rect.width / window.innerWidth,
              rect.height / window.innerHeight,
            )
          : 1
        const x = rect
          ? rect.left + (rect.width - window.innerWidth * scale) / 2
          : 0
        const y = rect
          ? rect.top + (rect.height - window.innerHeight * scale) / 2
          : 0
        entry.snapshotAnimation = preview.animate(
          [
            { transform: 'translate(0px, 0px) scale(1)', opacity: 1 },
            {
              transform: `translate(${x}px, ${y}px) scale(${scale})`,
              opacity: 0,
            },
          ],
          {
            duration,
            easing: 'cubic-bezier(0.65, 0, 0.35, 1)',
            fill: 'forwards',
          },
        )
      }
      void entry.animation.finished
        .then(() => {
          if (active.current !== entry) return
          flushSync(clear)
          target?.closest('a')?.focus({ preventScroll: true })
        })
        .catch(() => {})
    },
    [clear],
  )

  const value = useMemo(
    () => ({
      isEntering,
      returningProjectId,
      listView,
      rememberListView,
      enter,
      reveal,
      finishReturn,
    }),
    [isEntering, returningProjectId, listView, enter, reveal, finishReturn],
  )

  return (
    <ProjectEntryContext value={value}>
      <div className="contents" inert={isEntering} ref={content}>
        {children}
      </div>
      <div
        aria-label={returningProjectId ? '正在返回项目' : '正在打开项目'}
        aria-busy={isEntering}
        className="fixed inset-0 z-50 bg-background"
        hidden={!isEntering}
        ref={overlay}
        role="status"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 origin-top-left overflow-hidden"
          inert
          ref={snapshot}
        />
      </div>
    </ProjectEntryContext>
  )
}

export function useProjectEntryTransition() {
  const context = useContext(ProjectEntryContext)
  if (!context) throw new Error('ProjectEntryTransitionProvider is missing')
  return context
}
