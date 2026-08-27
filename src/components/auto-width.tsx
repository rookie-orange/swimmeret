import { useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import type { HTMLMotionProps, Transition } from 'motion/react'

import { cn } from '@/lib/utils'

type AutoWidthProps = Omit<
  HTMLMotionProps<'div'>,
  'animate' | 'children' | 'transition'
> & {
  children: ReactNode
  transition?: Transition
}

const defaultTransition: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
  bounce: 0,
  restDelta: 0.01,
}

function getHorizontalInset(element: HTMLElement) {
  const styles = window.getComputedStyle(element)

  return (
    Number.parseFloat(styles.paddingLeft) +
    Number.parseFloat(styles.paddingRight) +
    Number.parseFloat(styles.borderLeftWidth) +
    Number.parseFloat(styles.borderRightWidth)
  )
}

export function AutoWidth({
  children,
  className,
  transition = defaultTransition,
  ...props
}: AutoWidthProps) {
  const contentRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<number | null>(null)
  const [width, setWidth] = useState<number>()
  const reduceMotion = useReducedMotion()

  useLayoutEffect(() => {
    const content = contentRef.current
    const container = content?.parentElement

    if (!content || !container) return

    const updateWidth = () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current)
      }

      frameRef.current = window.requestAnimationFrame(() => {
        const pixelRatio = window.devicePixelRatio || 1
        const nextWidth =
          content.getBoundingClientRect().width + getHorizontalInset(container)
        setWidth(Math.ceil(nextWidth * pixelRatio) / pixelRatio)
        frameRef.current = null
      })
    }

    updateWidth()

    const resizeObserver = new ResizeObserver(updateWidth)
    resizeObserver.observe(content)

    return () => {
      resizeObserver.disconnect()
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current)
      }
    }
  }, [])

  return (
    <motion.div
      animate={width === undefined ? undefined : { width }}
      className={cn('overflow-hidden', className)}
      transition={reduceMotion ? { duration: 0 } : transition}
      {...props}
    >
      <div className="w-max" ref={contentRef}>
        {children}
      </div>
    </motion.div>
  )
}
