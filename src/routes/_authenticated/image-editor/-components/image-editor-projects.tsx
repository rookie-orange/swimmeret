import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  Add01Icon,
  Delete01Icon,
  ImageIcon,
  SearchIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { Button } from '@/components/ui/button'
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

const PROJECTS_STORAGE_KEY = 'swimmeret-image-editor-projects'
const TRASH_STORAGE_KEY = 'swimmeret-image-editor-trash'

export interface ImageEditorProject {
  id: string
  name: string
}

const emptyProjects: Array<ImageEditorProject> = []

function readStoredProjects(key: string) {
  if (typeof window === 'undefined') return emptyProjects

  try {
    const stored = window.localStorage.getItem(key)
    if (!stored) return emptyProjects
    const projects = JSON.parse(stored) as unknown
    return Array.isArray(projects)
      ? (projects as Array<ImageEditorProject>)
      : emptyProjects
  } catch {
    return emptyProjects
  }
}

function writeStoredProjects(key: string, projects: Array<ImageEditorProject>) {
  try {
    window.localStorage.setItem(key, JSON.stringify(projects))
  } catch {
    // Storage can be unavailable in private or restricted environments.
  }
}

function createProject(): ImageEditorProject {
  return {
    id: `project-${Date.now()}`,
    name: '未命名项目',
  }
}

function ProjectThumbnail({
  icon = ImageIcon,
  className,
  size = 48,
}: {
  icon?: typeof ImageIcon
  className?: string
  size?: number
}) {
  return (
    <div
      className={cn(
        'relative flex aspect-4/3 w-full rounded-xl items-center justify-center overflow-hidden border border-border bg-background',
        className,
      )}
    >
      <HugeiconsIcon
        className="text-muted-foreground"
        icon={icon}
        size={size}
      />
    </div>
  )
}

function ProjectItem({
  project,
  onDelete,
  onSelect,
  selected,
}: {
  project: ImageEditorProject
  onDelete: () => void
  onSelect: (checked: boolean) => void
  selected: boolean
}) {
  return (
    <article className="group/item min-w-0">
      <div className="relative">
        <Link
          aria-label={`打开项目 ${project.name}`}
          className="block"
          params={{ id: project.id }}
          preload="intent"
          to="/image-editor/$id"
        >
          <ProjectThumbnail />
        </Link>

        <Checkbox
          aria-label={`选择项目 ${project.name}`}
          checked={selected}
          className="absolute top-3 left-3 opacity-0 transition-opacity group-hover/item:opacity-100 group-focus-within/item:opacity-100"
          onCheckedChange={(checked) => onSelect(checked === true)}
        />

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                aria-label={`删除项目 ${project.name}`}
                className="absolute right-2 bottom-2 size-8 rounded-full bg-card/90 text-destructive opacity-0 transition-opacity group-hover/item:opacity-100 group-focus-within/item:opacity-100 hover:bg-destructive/10"
                onClick={onDelete}
                size="icon-sm"
                variant="destructive"
              />
            }
          >
            <HugeiconsIcon icon={Delete01Icon} />
          </TooltipTrigger>
          <TooltipContent>删除项目</TooltipContent>
        </Tooltip>
      </div>

      <p className="mt-3 truncate text-sm font-medium text-foreground">
        {project.name}
      </p>
    </article>
  )
}

export function ImageEditorProjectsPage() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<Array<ImageEditorProject>>(() =>
    readStoredProjects(PROJECTS_STORAGE_KEY),
  )
  const [trashedProjects, setTrashedProjects] = useState<
    Array<ImageEditorProject>
  >(() => readStoredProjects(TRASH_STORAGE_KEY))
  const [view, setView] = useState<'mine' | 'trash'>('mine')
  const [query, setQuery] = useState('')
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(
    () => new Set(),
  )

  useEffect(() => {
    writeStoredProjects(PROJECTS_STORAGE_KEY, projects)
  }, [projects])

  useEffect(() => {
    writeStoredProjects(TRASH_STORAGE_KEY, trashedProjects)
  }, [trashedProjects])

  const visibleProjects = useMemo(() => {
    const source = view === 'mine' ? projects : trashedProjects
    const normalizedQuery = query.trim().toLocaleLowerCase()
    if (!normalizedQuery) return source
    return source.filter((project) =>
      project.name.toLocaleLowerCase().includes(normalizedQuery),
    )
  }, [projects, query, trashedProjects, view])

  const handleCreateProject = () => {
    const project = createProject()
    const nextProjects = [project, ...projects]
    setProjects(nextProjects)
    writeStoredProjects(PROJECTS_STORAGE_KEY, nextProjects)
    void navigate({ to: '/image-editor/$id', params: { id: project.id } })
  }

  const handleDeleteProject = (project: ImageEditorProject) => {
    if (view === 'trash') {
      const nextTrash = trashedProjects.filter((item) => item.id !== project.id)
      setTrashedProjects(nextTrash)
      setSelectedProjectIds((current) => {
        const next = new Set(current)
        next.delete(project.id)
        return next
      })
      writeStoredProjects(TRASH_STORAGE_KEY, nextTrash)
      return
    }

    const nextProjects = projects.filter((item) => item.id !== project.id)
    const nextTrash = [project, ...trashedProjects]
    setProjects(nextProjects)
    setTrashedProjects(nextTrash)
    setSelectedProjectIds((current) => {
      const next = new Set(current)
      next.delete(project.id)
      return next
    })
    writeStoredProjects(PROJECTS_STORAGE_KEY, nextProjects)
    writeStoredProjects(TRASH_STORAGE_KEY, nextTrash)
  }

  return (
    <section className="h-full min-h-0 overflow-y-auto bg-background">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 pt-8 sm:px-10 sm:pt-10">
        <nav aria-label="项目范围" className="flex items-center gap-1">
          <Button
            aria-current={view === 'mine' ? 'page' : undefined}
            aria-pressed={view === 'mine'}
            className="rounded-full px-4"
            onClick={() => setView('mine')}
            variant={view === 'mine' ? 'secondary' : 'ghost'}
          >
            我的
          </Button>
          <Button
            aria-current={view === 'trash' ? 'page' : undefined}
            aria-pressed={view === 'trash'}
            className="rounded-full px-4"
            onClick={() => setView('trash')}
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
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索项目"
            value={query}
          />
        </InputGroup>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 pt-8 pb-14 sm:px-10">
        <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4 xl:grid-cols-5">
          {view === 'mine' && !query.trim() ? (
            <article className="group/item min-w-0">
              <Button
                aria-label="新建图片编辑项目"
                className="h-auto w-full rounded-none border-0 bg-transparent p-0 hover:bg-transparent"
                onClick={handleCreateProject}
                variant="ghost"
              >
                <ProjectThumbnail
                  icon={Add01Icon}
                  className="bg-secondary"
                  size={64}
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
    </section>
  )
}
