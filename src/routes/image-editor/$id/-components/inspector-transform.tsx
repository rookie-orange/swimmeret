import { useState } from 'react'
import {
  AlignBottomIcon,
  AlignHorizontalCenterIcon,
  AlignLeftIcon,
  AlignRightIcon,
  AlignTopIcon,
  AlignVerticalCenterIcon,
  Link01Icon,
  Unlink01Icon,
} from '@hugeicons/core-free-icons'
import { type Editor, useValue } from 'tldraw'
import { Button } from '@/components/ui/button'
import {
  InspectorAction,
  InspectorNumber,
  InspectorSection,
} from './inspector-controls'

const alignments = [
  { value: 'left', label: '左对齐', icon: AlignLeftIcon },
  {
    value: 'center-horizontal',
    label: '水平居中',
    icon: AlignHorizontalCenterIcon,
  },
  { value: 'right', label: '右对齐', icon: AlignRightIcon },
  { value: 'top', label: '顶部对齐', icon: AlignTopIcon },
  {
    value: 'center-vertical',
    label: '垂直居中',
    icon: AlignVerticalCenterIcon,
  },
  { value: 'bottom', label: '底部对齐', icon: AlignBottomIcon },
] as const

export function InspectorTransform({
  editor,
  disabled,
}: {
  editor: Editor
  disabled: boolean
}) {
  const [linked, setLinked] = useState(true)
  const selection = useValue(
    'inspector geometry',
    () => {
      const shapes = editor.getSelectedShapes()
      const shape = shapes.length === 1 ? shapes[0] : null
      const bounds = shape
        ? editor.getShapeGeometry(shape).bounds
        : editor.getSelectionPageBounds()
      const position = shape
        ? editor.getShapePageTransform(shape).point()
        : bounds?.point
      return {
        shapes,
        shape,
        bounds,
        position,
        rotation: shape
          ? (editor.getShapePageTransform(shape).rotation() * 180) / Math.PI
          : null,
      }
    },
    [editor],
  )
  if (!selection.bounds || !selection.position) return null
  const { shape, bounds, position } = selection
  const canResize = Boolean(
    shape &&
    editor.getShapeUtil(shape).canResize(shape) &&
    shape.type !== 'group',
  )
  const isText = shape?.type === 'text'
  const changeSize = (axis: 'x' | 'y', value: number) => {
    if (disabled || !shape || !canResize) return
    const current = editor.getShape(shape.id)
    if (!current || editor.isShapeOrAncestorLocked(current)) return
    const currentBounds = editor.getShapeGeometry(current).bounds
    const dimension = axis === 'x' ? currentBounds.w : currentBounds.h
    if (dimension <= 0) return
    const factor = value / dimension
    editor.markHistoryStoppingPoint('resize inspector selection')
    editor.resizeShape(
      current,
      {
        x: axis === 'x' || (linked && !isText) ? factor : 1,
        y: axis === 'y' || (linked && !isText) ? factor : 1,
      },
      {
        isAspectRatioLocked: !isText && linked,
        mode: 'resize_bounds',
        dragHandle: isText ? 'right' : 'bottom_right',
        scaleOrigin: editor
          .getShapePageTransform(current)
          .applyToPoint(currentBounds.point),
      },
    )
  }
  const move = (axis: 'x' | 'y', value: number) => {
    if (disabled) return
    const selected = editor.getSelectedShapes()
    const currentPosition =
      selected.length === 1
        ? editor.getShapePageTransform(selected[0]).point()
        : editor.getSelectionPageBounds()?.point
    if (!currentPosition) return
    editor.markHistoryStoppingPoint('position inspector selection')
    editor.nudgeShapes(selected, {
      x: axis === 'x' ? value - currentPosition.x : 0,
      y: axis === 'y' ? value - currentPosition.y : 0,
    })
  }
  return (
    <>
      {selection.shapes.length > 1 ? (
        <InspectorSection title="对齐与分布">
          <div className="flex items-center justify-between gap-1 rounded-xl bg-muted p-1">
            {alignments.map((item) => (
              <InspectorAction
                key={item.value}
                label={item.label}
                icon={item.icon}
                disabled={disabled}
                onClick={() => {
                  editor.markHistoryStoppingPoint('align inspector selection')
                  editor.alignShapes(editor.getSelectedShapeIds(), item.value)
                }}
              />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(['horizontal', 'vertical'] as const).map((axis) => (
              <Button
                key={axis}
                disabled={disabled || selection.shapes.length < 3}
                size="sm"
                variant="secondary"
                onClick={() => {
                  editor.markHistoryStoppingPoint(
                    'distribute inspector selection',
                  )
                  editor.distributeShapes(editor.getSelectedShapeIds(), axis)
                }}
              >
                {axis === 'horizontal' ? '水平等距' : '垂直等距'}
              </Button>
            ))}
          </div>
        </InspectorSection>
      ) : null}
      <InspectorSection
        title="尺寸"
        action={
          canResize && !isText ? (
            <InspectorAction
              label={linked ? '解除宽高比例锁定' : '锁定宽高比例'}
              icon={linked ? Link01Icon : Unlink01Icon}
              aria-pressed={linked}
              disabled={disabled}
              onClick={() => setLinked(!linked)}
            />
          ) : null
        }
      >
        <div className="grid grid-cols-2 gap-2">
          <InspectorNumber
            label="宽度"
            suffix="宽"
            value={bounds.w}
            min={1}
            disabled={disabled || !canResize}
            onCommit={(value) => changeSize('x', value)}
          />
          <InspectorNumber
            label="高度"
            suffix="高"
            value={bounds.h}
            min={1}
            disabled={disabled || !canResize || isText}
            onCommit={(value) => changeSize('y', value)}
          />
        </div>
        {isText ? (
          <p className="text-xs text-muted-foreground">
            高度随文字内容自动调整
          </p>
        ) : null}
      </InspectorSection>
      <InspectorSection title="位置">
        <div className="grid grid-cols-2 gap-2">
          <InspectorNumber
            label="水平位置"
            suffix="X"
            value={position.x}
            disabled={disabled}
            onCommit={(value) => move('x', value)}
          />
          <InspectorNumber
            label="垂直位置"
            suffix="Y"
            value={position.y}
            disabled={disabled}
            onCommit={(value) => move('y', value)}
          />
        </div>
        {shape ? (
          <InspectorNumber
            label="旋转角度"
            suffix="°"
            value={selection.rotation}
            disabled={disabled}
            onCommit={(value) => {
              if (disabled) return
              const current = editor.getShape(shape.id)
              if (!current) return
              editor.markHistoryStoppingPoint('rotate inspector selection')
              editor.rotateShapesBy(
                [current.id],
                (value * Math.PI) / 180 -
                  editor.getShapePageTransform(current).rotation(),
              )
            }}
          />
        ) : null}
      </InspectorSection>
    </>
  )
}
