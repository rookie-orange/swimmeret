import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Link } from '@tanstack/react-router'
import { Add01Icon, Delete01Icon, SearchIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { Button } from '@/components/ui/button'
import { useProjectEntryTransition } from '@/components/project-entry-transition'
import { Checkbox } from '@/components/ui/checkbox'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { RotateCcw } from 'lucide-react'
import {
  migrateLegacyProjects,
  workspaceRepository,
} from '@/lib/project-storage/repository'
import { storageError, type ProjectSummary } from '@/lib/project-storage/types'
import { readProjectPreview } from '@/lib/project-preview'

import { ProjectSelectionDock } from './project-selection-dock'

function ProjectThumbnail({
  className,
  project,
}: {
  className?: string
  project: ProjectSummary
}) {
  const cacheKey = `${project.id}:${project.updatedAt}`
  const [preview, setPreview] = useState<{
    cacheKey: string
    url: string
  } | null>(null)
  const previewUrl = preview?.cacheKey === cacheKey ? preview.url : null

  useEffect(() => {
    let active = true
    let objectUrl: string | undefined
    void readProjectPreview(project.id, workspaceRepository.assets)
      .then((blob) => {
        const nextUrl = URL.createObjectURL(blob)
        if (!active) {
          URL.revokeObjectURL(nextUrl)
          return
        }
        objectUrl = nextUrl
        setPreview({ cacheKey, url: nextUrl })
      })
      .catch(() => {})
    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [cacheKey, project.id])

  return (
    <div
      className={cn(
        'relative flex aspect-5/3 w-full items-center justify-center overflow-hidden rounded-xl bg-muted',
        className,
      )}
    >
      {previewUrl ? (
        <img
          alt=""
          className="size-full object-contain"
          decoding="async"
          draggable={false}
          loading="lazy"
          src={previewUrl}
        />
      ) : null}
    </div>
  )
}

function ProjectItem({
  project,
  onDelete,
  onSelect,
  selected,
  selectionMode,
  onRestore,
  disabled,
  onOpen,
}: {
  project: ProjectSummary
  onDelete: () => void
  onSelect: (checked: boolean) => void
  selected: boolean
  selectionMode: boolean
  onRestore: () => void
  disabled: boolean
  onOpen: (source: HTMLElement) => void
}) {
  return (
    <article className="group/item min-w-0">
      <div className="relative">
        {project.trashed ? (
          <ProjectThumbnail project={project} />
        ) : (
          <Link
            aria-label={`打开项目 ${project.name}`}
            className="block"
            data-project-id={project.id}
            params={{ id: project.id }}
            preload="intent"
            to="/image-editor/$id"
            onClick={(event) => {
              if (
                event.button !== 0 ||
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey
              )
                return
              event.preventDefault()
              if (!disabled)
                onOpen(event.currentTarget.firstElementChild as HTMLElement)
            }}
          >
            <ProjectThumbnail project={project} />
          </Link>
        )}

        {project.trashed && !selectionMode ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  aria-label={`恢复项目 ${project.name}`}
                  disabled={disabled}
                  className="absolute right-12 bottom-2 opacity-0 transition-opacity group-hover/item:opacity-100 group-focus-within/item:opacity-100"
                  onClick={onRestore}
                  size="icon"
                  variant="secondary"
                />
              }
            >
              <RotateCcw />
            </TooltipTrigger>
            <TooltipContent>恢复项目</TooltipContent>
          </Tooltip>
        ) : null}

        <Checkbox
          aria-label={`选择项目 ${project.name}`}
          checked={selected}
          disabled={disabled}
          className={cn(
            'absolute top-3 left-3 size-5 bg-background opacity-0 transition-opacity group-hover/item:opacity-100 group-focus-within/item:opacity-100',
            selectionMode && 'opacity-100',
          )}
          onCheckedChange={(checked) => onSelect(checked === true)}
        />

        {selectionMode ? null : (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  aria-label={`删除项目 ${project.name}`}
                  className="absolute right-2 bottom-2 opacity-0 transition-opacity group-hover/item:opacity-100 group-focus-within/item:opacity-100"
                  onClick={onDelete}
                  disabled={disabled}
                  size="icon"
                  variant="destructive"
                />
              }
            >
              <HugeiconsIcon icon={Delete01Icon} />
            </TooltipTrigger>
            <TooltipContent>删除项目</TooltipContent>
          </Tooltip>
        )}
      </div>

      <p className="mt-3 truncate text-sm font-medium text-foreground">
        {project.name}
      </p>
    </article>
  )
}

export function ImageEditorProjectsPage() {
  const {
    enter,
    isEntering,
    returningProjectId,
    finishReturn,
    listView,
    rememberListView,
  } = useProjectEntryTransition()
  const list = useRef<HTMLElement>(null)
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<'mine' | 'trash'>('mine')
  const [query, setQuery] = useState(listView.query)
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(
    () => new Set(),
  )

  const reload = useCallback(async () => {
    await migrateLegacyProjects()
    setProjects(
      (await workspaceRepository.projects.list()).sort(
        (a, b) => b.updatedAt - a.updatedAt,
      ),
    )
  }, [])

  useEffect(() => {
    void migrateLegacyProjects()
      .then(() => workspaceRepository.projects.list())
      .then((projects) =>
        setProjects(projects.sort((a, b) => b.updatedAt - a.updatedAt)),
      )
      .catch((error: unknown) => setError(storageError(error)))
      .finally(() => setIsLoading(false))
  }, [])

  const visibleProjects = useMemo(() => {
    const source = projects.filter(
      (project) => project.trashed === (view === 'trash'),
    )
    const normalizedQuery = query.trim().toLocaleLowerCase()
    if (!normalizedQuery) return source
    return source.filter((project) =>
      project.name.toLocaleLowerCase().includes(normalizedQuery),
    )
  }, [projects, query, view])

  const selectionMode = selectedProjectIds.size > 0
  const selectedVisibleProjects = visibleProjects.filter((project) =>
    selectedProjectIds.has(project.id),
  )
  const allVisibleSelected =
    visibleProjects.length > 0 &&
    visibleProjects.every((project) => selectedProjectIds.has(project.id))
  const partiallyVisibleSelected =
    selectedVisibleProjects.length > 0 && !allVisibleSelected

  useLayoutEffect(() => {
    const container = list.current
    if (isLoading || !returningProjectId || !container) return
    container.scrollTop = listView.scrollTop
    const link = container.querySelector<HTMLAnchorElement>(
      `[data-project-id="${CSS.escape(returningProjectId)}"]`,
    )
    const target = link?.firstElementChild as HTMLElement | null
    if (target) {
      const bounds = target.getBoundingClientRect()
      const viewport = container.getBoundingClientRect()
      if (bounds.top < viewport.top || bounds.bottom > viewport.bottom) {
        target.scrollIntoView({ block: 'center', behavior: 'instant' })
      }
    }
    finishReturn(target)
  }, [isLoading, returningProjectId, listView.scrollTop, finishReturn])

  const rememberPosition = () =>
    rememberListView({ query, scrollTop: list.current?.scrollTop ?? 0 })

  const mutate = async (action: () => Promise<void>) => {
    if (isPending || isLoading) return
    setIsPending(true)
    setError(null)
    try {
      await action()
      await reload()
    } catch (error) {
      setError(storageError(error))
    } finally {
      setIsPending(false)
    }
  }

  const handleCreateProject = (source: HTMLElement) => {
    if (isPending || isLoading || isEntering) return
    rememberPosition()
    setError(null)
    void enter(source, async () => {
      const project = await workspaceRepository.projects.create({
        id: crypto.randomUUID(),
        name: '未命名项目',
        trashed: false,
      })
      return project.id
    }).catch((error: unknown) => setError(storageError(error)))
  }

  const handleDeleteProject = (project: ProjectSummary) =>
    void mutate(async () => {
      if (project.trashed) await workspaceRepository.projects.delete(project.id)
      else await workspaceRepository.projects.setTrashed(project.id, true)
    })

  const handleDeleteSelected = () =>
    void mutate(async () => {
      await Promise.all(
        selectedVisibleProjects.map((project) =>
          project.trashed
            ? workspaceRepository.projects.delete(project.id)
            : workspaceRepository.projects.setTrashed(project.id, true),
        ),
      )
      setSelectedProjectIds(new Set())
    })

  return (
    <section
      className="h-full min-h-0 overflow-y-auto bg-background"
      ref={list}
    >
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 pt-8 sm:px-10 sm:pt-10">
        <nav aria-label="项目范围" className="flex items-center gap-1">
          <Button
            aria-current={view === 'mine' ? 'page' : undefined}
            aria-pressed={view === 'mine'}
            className="rounded-full px-4"
            onClick={() => {
              setView('mine')
              setSelectedProjectIds(new Set())
            }}
            variant={view === 'mine' ? 'secondary' : 'ghost'}
          >
            我的
          </Button>
          <Button
            aria-current={view === 'trash' ? 'page' : undefined}
            aria-pressed={view === 'trash'}
            className="rounded-full px-4"
            onClick={() => {
              setView('trash')
              setSelectedProjectIds(new Set())
            }}
            variant={view === 'trash' ? 'secondary' : 'ghost'}
          >
            回收站
          </Button>
        </nav>

        <InputGroup className="max-w-64 flex-1 bg-card">
          <InputGroupAddon>
            <HugeiconsIcon icon={SearchIcon} size={16} />
          </InputGroupAddon>
          <InputGroupInput
            aria-label="搜索项目"
            onChange={(event) => {
              setQuery(event.target.value)
              setSelectedProjectIds(new Set())
            }}
            placeholder="搜索项目"
            value={query}
          />
        </InputGroup>
      </header>

      <main
        className={cn(
          'mx-auto w-full max-w-6xl px-6 pt-8 pb-14 sm:px-10',
          selectionMode && 'pb-24',
        )}
      >
        {isLoading ? (
          <p className="mb-4 text-sm text-muted-foreground" role="status">
            正在读取项目…
          </p>
        ) : null}
        {error ? (
          <div className="mb-4 flex items-center gap-2">
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
            <Button variant="ghost" onClick={() => void mutate(reload)}>
              重试
            </Button>
          </div>
        ) : null}
        <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4 xl:grid-cols-5">
          {view === 'mine' && !query.trim() ? (
            <article className="group/item min-w-0">
              <Button
                aria-label="添加项目"
                disabled={isPending || isLoading || isEntering}
                onClick={(event) => handleCreateProject(event.currentTarget)}
                variant="outline"
                className="aspect-5/3 h-auto w-full rounded-xl bg-background p-0 hover:bg-background/80"
              >
                <HugeiconsIcon
                  className="size-12"
                  icon={Add01Icon}
                  strokeWidth={1}
                />
              </Button>
              <p className="mt-3 truncate text-sm font-medium text-foreground">
                添加项目
              </p>
            </article>
          ) : null}

          {visibleProjects.map((project) => (
            <ProjectItem
              key={project.id}
              onDelete={() => handleDeleteProject(project)}
              onRestore={() =>
                void mutate(() =>
                  workspaceRepository.projects.setTrashed(project.id, false),
                )
              }
              disabled={isPending}
              selectionMode={selectionMode}
              onOpen={(source) => {
                rememberPosition()
                setError(null)
                void enter(source, async () => project.id).catch(
                  (error: unknown) => setError(storageError(error)),
                )
              }}
              onSelect={(checked) => {
                setSelectedProjectIds((current) => {
                  const next = new Set(current)
                  if (checked) next.add(project.id)
                  else next.delete(project.id)
                  return next
                })
              }}
              project={project}
              selected={selectedProjectIds.has(project.id)}
            />
          ))}
        </div>

        {visibleProjects.length === 0 && !(view === 'mine' && !query.trim()) ? (
          <div className="flex min-h-48 items-center justify-center text-sm text-muted-foreground">
            {query.trim()
              ? '没有找到匹配的项目'
              : view === 'trash'
                ? '回收站为空'
                : '还没有项目'}
          </div>
        ) : null}
      </main>

      <ProjectSelectionDock
        allSelected={allVisibleSelected}
        disabled={isPending}
        isTrash={view === 'trash'}
        onClear={() => setSelectedProjectIds(new Set())}
        onDelete={handleDeleteSelected}
        onToggleAll={(checked) => {
          setSelectedProjectIds(
            checked
              ? new Set(visibleProjects.map((project) => project.id))
              : new Set(),
          )
        }}
        open={selectionMode}
        partiallySelected={partiallyVisibleSelected}
        selectedCount={selectedVisibleProjects.length}
      />
    </section>
  )
}
