export const CANVAS_BACKGROUNDS = [
  {
    id: 'default',
    label: '默认',
    className: 'project-canvas-background-default',
  },
  { id: 'muted', label: '雾灰', className: 'project-canvas-background-muted' },
  {
    id: 'lavender',
    label: '浅紫',
    className: 'project-canvas-background-lavender',
  },
  { id: 'mint', label: '浅绿', className: 'project-canvas-background-mint' },
  { id: 'sand', label: '暖沙', className: 'project-canvas-background-sand' },
  { id: 'ink', label: '深色', className: 'project-canvas-background-ink' },
] as const

export type CanvasBackgroundId = (typeof CANVAS_BACKGROUNDS)[number]['id']

export function getCanvasBackgroundId(value: unknown): CanvasBackgroundId {
  return CANVAS_BACKGROUNDS.some((option) => option.id === value)
    ? (value as CanvasBackgroundId)
    : 'default'
}

export function getCanvasBackgroundClass(value: unknown) {
  const id = getCanvasBackgroundId(value)
  return CANVAS_BACKGROUNDS.find((option) => option.id === id)!.className
}
