import { useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  Add01Icon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  Copy01Icon,
  Delete02Icon,
  Edit02Icon,
  Home01Icon,
  Menu01Icon,
  MoreHorizontalIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  getIndexAbove,
  getIndexBelow,
  getIndexBetween,
  PageRecordType,
  type Editor,
  type IndexKey,
  type TLPage,
  type TLPageId,
  useValue,
} from 'tldraw'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

function getPageMoveIndex(pages: TLPage[], from: number, to: number) {
  const below = from > to ? pages[to - 1] : pages[to]
  const above = from > to ? pages[to] : pages[to + 1]

  if (below && !above) return getIndexAbove(below.index)
  if (!below && above) return getIndexBelow(pages[0].index)
  return getIndexBetween(below.index, above.index)
}

function PageNameInput({
  editor,
  onFinish,
  page,
}: {
  editor: Editor
  onFinish: () => void
  page: TLPage
}) {
  const [name, setName] = useState(page.name)
  const isCancelingRef = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  const save = () => {
    if (isCancelingRef.current) return
    const nextName = name.trim()
    if (nextName && nextName !== page.name) {
      editor.markHistoryStoppingPoint('rename page')
      editor.renamePage(page.id, nextName)
    }
    onFinish()
  }

  return (
    <Input
      aria-label={`重命名页面 ${page.name}`}
      className="ml-1 h-8 min-w-0 flex-1"
      onBlur={save}
      onChange={(event) => setName(event.target.value)}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        event.stopPropagation()
        if (event.key === 'Enter') {
          event.preventDefault()
          event.currentTarget.blur()
        }
        if (event.key === 'Escape') {
          event.preventDefault()
          isCancelingRef.current = true
          onFinish()
        }
      }}
      ref={inputRef}
      value={name}
    />
  )
}

function PageActions({
  editor,
  index,
  onRename,
  page,
  pages,
}: {
  editor: Editor
  index: number
  onRename: () => void
  page: TLPage
  pages: TLPage[]
}) {
  const [isOpen, setIsOpen] = useState(false)

  const movePage = (targetIndex: number) => {
    const nextIndex = getPageMoveIndex(pages, index, targetIndex)
    if (nextIndex === page.index) return
    editor.markHistoryStoppingPoint('move page')
    editor.updatePage({ id: page.id, index: nextIndex as IndexKey })
  }

  return (
    <DropdownMenuSub onOpenChange={setIsOpen} open={isOpen}>
      <DropdownMenuSubTrigger
        aria-label={`管理页面 ${page.name}`}
        className="ml-auto size-8 justify-center p-0 [&>svg:last-child]:hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <HugeiconsIcon icon={MoreHorizontalIcon} />
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <DropdownMenuGroup>
          <DropdownMenuItem
            closeOnClick={false}
            onClick={() => {
              setIsOpen(false)
              onRename()
            }}
          >
            <HugeiconsIcon icon={Edit02Icon} />
            重命名
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={pages.length >= editor.options.maxPages}
            onClick={() => {
              editor.markHistoryStoppingPoint('duplicate page')
              editor.duplicatePage(page.id, PageRecordType.createId())
            }}
          >
            <HugeiconsIcon icon={Copy01Icon} />
            复制页面
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={index === 0}
            onClick={() => movePage(index - 1)}
          >
            <HugeiconsIcon icon={ArrowUp01Icon} />
            上移
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={index === pages.length - 1}
            onClick={() => movePage(index + 1)}
          >
            <HugeiconsIcon icon={ArrowDown01Icon} />
            下移
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            disabled={pages.length === 1}
            onClick={() => {
              editor.markHistoryStoppingPoint('delete page')
              editor.deletePage(page.id)
            }}
            variant="destructive"
          >
            <HugeiconsIcon icon={Delete02Icon} />
            删除页面
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  )
}

export function ImageEditorPageMenu({ editor }: { editor: Editor | null }) {
  const [editingPageId, setEditingPageId] = useState<TLPageId | null>(null)
  const pages = useValue('image editor pages', () => editor?.getPages() ?? [], [
    editor,
  ])
  const currentPageId = useValue(
    'image editor current page id',
    () => editor?.getCurrentPageId() ?? null,
    [editor],
  )
  const currentPage = pages.find((page) => page.id === currentPageId)

  return (
    <DropdownMenu onOpenChange={(open) => !open && setEditingPageId(null)}>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label="打开页面菜单"
            className="min-w-0 max-w-48 rounded-xl"
            disabled={!editor}
            variant="ghost"
          />
        }
      >
        <HugeiconsIcon data-icon="inline-start" icon={Menu01Icon} />
        <span className="min-w-0 flex-1 truncate">
          {currentPage?.name ?? '页面'}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-72" sideOffset={8}>
        <DropdownMenuGroup>
          <DropdownMenuItem
            render={<Link activeOptions={{ exact: true }} to="/image-editor" />}
          >
            <HugeiconsIcon icon={Home01Icon} />
            返回主页
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup className="flex max-h-72 flex-col gap-0.5 overflow-y-auto">
          <DropdownMenuLabel>页面</DropdownMenuLabel>
          {pages.map((page, index) => {
            const isCurrent = page.id === currentPageId
            const isEditing = page.id === editingPageId

            return (
              <div
                className={cn(
                  'flex min-h-10 items-center rounded-xl pr-1',
                  isCurrent && 'bg-secondary text-secondary-foreground',
                )}
                key={page.id}
              >
                {isEditing && editor ? (
                  <PageNameInput
                    editor={editor}
                    onFinish={() => setEditingPageId(null)}
                    page={page}
                  />
                ) : (
                  <DropdownMenuItem
                    aria-current={isCurrent ? 'page' : undefined}
                    className="min-w-0 flex-1"
                    closeOnClick={false}
                    onClick={() => editor?.setCurrentPage(page.id)}
                    onDoubleClick={() => setEditingPageId(page.id)}
                  >
                    <span className="min-w-0 flex-1 truncate">{page.name}</span>
                  </DropdownMenuItem>
                )}
                {editor ? (
                  <PageActions
                    editor={editor}
                    index={index}
                    onRename={() => setEditingPageId(page.id)}
                    page={page}
                    pages={pages}
                  />
                ) : null}
              </div>
            )
          })}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            disabled={
              !editor || pages.length >= (editor?.options.maxPages ?? 0)
            }
            onClick={() => {
              if (!editor) return
              editor.markHistoryStoppingPoint('create page')
              const pageId = PageRecordType.createId()
              editor.createPage({
                id: pageId,
                name: `页面 ${pages.length + 1}`,
              })
              editor.setCurrentPage(pageId)
            }}
          >
            <HugeiconsIcon icon={Add01Icon} />
            添加页面
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
