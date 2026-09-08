import {
  Cancel01Icon,
  Delete01Icon,
  FolderTransferIcon,
  Share01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'

import { Button, buttonVariants } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface ProjectSelectionDockProps {
  allSelected: boolean
  disabled: boolean
  isTrash: boolean
  onClear: () => void
  onDelete: () => void
  onToggleAll: (checked: boolean) => void
  open: boolean
  partiallySelected: boolean
  selectedCount: number
}

export function ProjectSelectionDock({
  allSelected,
  disabled,
  isTrash,
  onClear,
  onDelete,
  onToggleAll,
  open,
  partiallySelected,
  selectedCount,
}: ProjectSelectionDockProps) {
  const reduceMotion = useReducedMotion()

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="pointer-events-none fixed right-2 bottom-3 left-22 z-30 flex justify-center sm:right-4 sm:bottom-4 sm:left-26"
          exit={{
            opacity: 0,
            scale: reduceMotion ? 1 : 0.97,
            y: reduceMotion ? 0 : 12,
          }}
          initial={{
            opacity: 0,
            scale: reduceMotion ? 1 : 0.96,
            y: reduceMotion ? 0 : 16,
          }}
          transition={
            reduceMotion ? { duration: 0 } : { duration: 0.18, ease: 'easeOut' }
          }
        >
          <div className="pointer-events-auto flex min-w-0 max-w-full items-center gap-1 rounded-3xl border border-border bg-card/95 p-1 shadow-2xl shadow-foreground/10 backdrop-blur-xl">
            <label
              className={buttonVariants({
                className:
                  'cursor-pointer data-disabled:pointer-events-none data-disabled:opacity-50',
                variant: 'ghost',
              })}
              data-disabled={disabled || undefined}
            >
              <Checkbox
                aria-label={allSelected ? '取消全选' : '全选'}
                checked={allSelected}
                className="size-5 rounded-full"
                disabled={disabled}
                indeterminate={partiallySelected}
                onCheckedChange={(checked) => onToggleAll(checked === true)}
              />
              <span aria-live="polite">已选 {selectedCount} 项</span>
            </label>

            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    aria-label={isTrash ? '永久删除所选项目' : '删除所选项目'}
                    disabled={disabled}
                    onClick={onDelete}
                    size="icon-lg"
                    variant="ghost"
                  />
                }
              >
                <HugeiconsIcon icon={Delete01Icon} />
              </TooltipTrigger>
              <TooltipContent>{isTrash ? '永久删除' : '删除'}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    aria-label="分享所选项目"
                    disabled
                    size="icon-lg"
                    variant="ghost"
                  />
                }
              >
                <HugeiconsIcon icon={Share01Icon} />
              </TooltipTrigger>
              <TooltipContent>分享</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    aria-label="移动所选项目"
                    disabled
                    size="icon-lg"
                    variant="ghost"
                  />
                }
              >
                <HugeiconsIcon icon={FolderTransferIcon} />
              </TooltipTrigger>
              <TooltipContent>移动到…</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    aria-label="取消选择"
                    disabled={disabled}
                    onClick={onClear}
                    size="icon-lg"
                    variant="ghost"
                  />
                }
              >
                <HugeiconsIcon icon={Cancel01Icon} />
              </TooltipTrigger>
              <TooltipContent>取消选择</TooltipContent>
            </Tooltip>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
