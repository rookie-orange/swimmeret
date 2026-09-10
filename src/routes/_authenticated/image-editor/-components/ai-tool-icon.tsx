import { createElement, useId } from 'react'
import { SparklesIcon } from '@hugeicons/core-free-icons'
import { useReducedMotion } from 'motion/react'

import { cn } from '@/lib/utils'

export function AiToolIcon({ active }: { active: boolean }) {
  const id = useId()
  const gradientId = `${id}-gradient`
  const shapeId = `${id}-shape`
  const reduceMotion = useReducedMotion()

  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <defs>
        <linearGradient
          gradientUnits="userSpaceOnUse"
          id={gradientId}
          x1="0"
          x2="24"
          y1="0"
          y2="24"
        >
          <stop
            className="text-ai-start"
            offset="0%"
            stopColor="currentColor"
          />
          <stop
            className="text-ai-middle"
            offset="50%"
            stopColor="currentColor"
          />
          <stop
            className="text-ai-end"
            offset="100%"
            stopColor="currentColor"
          />
          {active && !reduceMotion ? (
            <animateTransform
              attributeName="gradientTransform"
              dur="3s"
              from="0 12 12"
              repeatCount="indefinite"
              to="360 12 12"
              type="rotate"
            />
          ) : null}
        </linearGradient>
        <g id={shapeId}>
          {SparklesIcon.map(([tag, attributes]) =>
            createElement(tag, { ...attributes, stroke: 'inherit' }),
          )}
        </g>
      </defs>
      <use
        className={cn(
          'motion-safe:transition-opacity motion-safe:duration-200',
          active && 'opacity-0',
        )}
        href={`#${shapeId}`}
        stroke="currentColor"
      />
      <use
        className={cn(
          'opacity-0 motion-safe:transition-opacity motion-safe:duration-200',
          active && 'opacity-100',
        )}
        href={`#${shapeId}`}
        stroke={`url(#${gradientId})`}
      />
    </svg>
  )
}
