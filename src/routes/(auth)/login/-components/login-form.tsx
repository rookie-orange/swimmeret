import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { FocusEventHandler, FormEvent, RefObject } from 'react'
import gsap from 'gsap'
import { ArrowRight } from 'lucide-react'
import { useReducedMotion } from 'motion/react'

import { Button } from '@/components/ui/button'
import { loginWithKey } from '@/lib/auth'
import { cn } from '@/lib/utils'

type LoginFormProps = {
  onSuccess: () => void
}

type LoginInputProps = {
  disabled: boolean
  focused: boolean
  frameRef: RefObject<HTMLDivElement | null>
  inputRef: RefObject<HTMLInputElement | null>
  inputShellRef: RefObject<HTMLDivElement | null>
  trackRef: RefObject<HTMLDivElement | null>
  buttonRef: RefObject<HTMLSpanElement | null>
  onBlur: FocusEventHandler<HTMLDivElement>
  onFocus: FocusEventHandler<HTMLDivElement>
}

function LoginInput({
  disabled,
  focused,
  frameRef,
  inputRef,
  inputShellRef,
  trackRef,
  buttonRef,
  onBlur,
  onFocus,
}: LoginInputProps) {
  return (
    <div className="w-72 max-w-full" ref={trackRef}>
      <div className="w-full" ref={inputShellRef}>
        <div
          ref={frameRef}
          className={cn(
            'flex h-14 items-center rounded-2xl border border-primary-foreground/35 bg-primary-foreground/10 pl-4 pr-1.5 backdrop-blur-sm transition-[border-color,box-shadow] duration-300',
            focused &&
              'border-primary-foreground/70 shadow-lg shadow-primary-foreground/15',
            disabled && 'pointer-events-none',
          )}
          onBlur={onBlur}
          onFocus={onFocus}
        >
          <input
            autoComplete="off"
            ref={inputRef}
            className="min-w-0 flex-1 overflow-hidden bg-transparent px-0 text-sm text-primary-foreground outline-none placeholder:text-primary-foreground/60 disabled:cursor-not-allowed"
            disabled={disabled}
            id="access-key"
            name="access-key"
            placeholder="输入访问 key"
            required
            type="password"
          />
          <span className="inline-flex shrink-0" ref={buttonRef}>
            <Button
              aria-label="登录"
              className="size-10 rounded-full bg-primary-foreground text-primary hover:bg-primary-foreground/85 disabled:opacity-100"
              disabled={disabled}
              size="icon"
              type="submit"
            >
              <ArrowRight />
            </Button>
          </span>
        </div>
      </div>
    </div>
  )
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const titleRef = useRef<HTMLHeadingElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const inputShellRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const buttonRef = useRef<HTMLSpanElement>(null)
  const focusTweenRef = useRef<gsap.core.Tween | null>(null)
  const exitTimelineRef = useRef<gsap.core.Timeline | null>(null)
  const [isFocused, setIsFocused] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const reduceMotion = useReducedMotion()

  useLayoutEffect(() => {
    const track = trackRef.current
    if (!track || isSubmitting || exitTimelineRef.current) return

    focusTweenRef.current?.kill()
    focusTweenRef.current = null

    const focusTween = gsap.to(track, {
      width: isFocused ? '100%' : '18rem',
      duration: reduceMotion ? 0 : 0.65,
      ease: 'power3.out',
      overwrite: 'auto',
    })
    focusTweenRef.current = focusTween

    return () => {
      focusTween.kill()
      if (focusTweenRef.current === focusTween) {
        focusTweenRef.current = null
      }
    }
  }, [isFocused, isSubmitting, reduceMotion])

  useEffect(() => {
    return () => {
      exitTimelineRef.current?.kill()
    }
  }, [])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSubmitting || exitTimelineRef.current) return

    const formData = new FormData(event.currentTarget)
    const didLogin = loginWithKey(String(formData.get('access-key') ?? ''))

    if (!didLogin) {
      return
    }

    const inputShell = inputShellRef.current
    const track = trackRef.current
    const frame = frameRef.current
    const input = inputRef.current
    const button = buttonRef.current
    const title = titleRef.current

    if (
      !track ||
      !inputShell ||
      !frame ||
      !input ||
      !button ||
      !title ||
      reduceMotion
    ) {
      onSuccess()
      return
    }

    focusTweenRef.current?.kill()
    focusTweenRef.current = null

    const trackWidth = track.getBoundingClientRect().width
    const shellLeft = inputShell.getBoundingClientRect().left
    const collapsedWidth = frame.offsetHeight

    setIsSubmitting(true)

    // Freeze the centered track so only the shell's right edge moves inward.
    gsap.set(track, { width: trackWidth })

    const exitTimeline = gsap.timeline({
      onComplete: onSuccess,
    })
    exitTimelineRef.current = exitTimeline
    exitTimeline
      .addLabel('collapse')
      .set(input, { autoAlpha: 0 }, 'collapse')
      .to(
        inputShell,
        {
          width: collapsedWidth,
          duration: 0.46,
          ease: 'power2.inOut',
        },
        'collapse',
      )
      .to(
        frame,
        {
          borderRadius: '9999px',
          paddingLeft: 7,
          paddingRight: 7,
          duration: 0.46,
          ease: 'power2.inOut',
        },
        'collapse',
      )
      .to(
        inputShell,
        {
          x: -24,
          duration: 0.46,
          ease: 'power3.out',
        },
        'collapse',
      )
      .addLabel('launch')
      .to(inputShell, {
        x: () => window.innerWidth - shellLeft + collapsedWidth,
        duration: 0.62,
        ease: 'power3.in',
      })
      .to(
        title,
        {
          autoAlpha: 0,
          duration: 0.62,
          ease: 'power1.out',
        },
        'launch',
      )
  }

  return (
    <section className="flex w-full flex-col items-center gap-8">
      <h1
        className="text-4xl font-semibold tracking-normal sm:text-5xl"
        ref={titleRef}
      >
        swimmeret
      </h1>

      <form className="flex w-full justify-center" onSubmit={handleSubmit}>
        <label className="sr-only" htmlFor="access-key">
          访问 key
        </label>
        <LoginInput
          disabled={isSubmitting}
          focused={isFocused}
          frameRef={frameRef}
          inputRef={inputRef}
          inputShellRef={inputShellRef}
          trackRef={trackRef}
          buttonRef={buttonRef}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
              setIsFocused(false)
            }
          }}
          onFocus={() => setIsFocused(true)}
        />
      </form>
    </section>
  )
}
