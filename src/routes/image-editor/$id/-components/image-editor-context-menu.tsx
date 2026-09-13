import {
  ClipboardMenuGroup,
  DefaultContextMenu,
  GroupMenuItem,
  SelectAllMenuItem,
  TldrawUiMenuActionItem,
  TldrawUiMenuGroup,
  TldrawUiMenuItem,
  ToggleLockMenuItem,
  type TLUiContextMenuProps,
  UngroupMenuItem,
  useEditor,
  useValue,
} from 'tldraw'

import { useImageEditorInspector } from '../-context/image-editor-inspector-state'

function ImageEditorContextMenuContent() {
  const editor = useEditor()
  const { setActiveTab } = useImageEditorInspector()
  const selection = useValue(
    'image editor context menu selection',
    () => {
      const shapes = editor.getSelectedShapes()
      return {
        count: shapes.length,
        hasGroup: shapes.some((shape) => shape.type === 'group'),
        isImage: shapes.length === 1 && shapes[0]?.type === 'image',
      }
    },
    [editor],
  )

  return (
    <div className="project-context-menu">
      <ClipboardMenuGroup />
      {selection.count > 0 ? (
        <>
          <TldrawUiMenuGroup id="project-arrange">
            <TldrawUiMenuActionItem actionId="bring-to-front" />
            <TldrawUiMenuActionItem actionId="bring-forward" />
            <TldrawUiMenuActionItem actionId="send-backward" />
            <TldrawUiMenuActionItem actionId="send-to-back" />
          </TldrawUiMenuGroup>
          <TldrawUiMenuGroup id="project-group">
            {selection.count > 1 ? <GroupMenuItem /> : null}
            {selection.hasGroup ? <UngroupMenuItem /> : null}
            <ToggleLockMenuItem />
          </TldrawUiMenuGroup>
        </>
      ) : null}
      {selection.isImage ? (
        <TldrawUiMenuGroup id="project-image">
          <TldrawUiMenuItem
            id="image-properties"
            label="图片属性"
            onSelect={() => setActiveTab('properties')}
          />
          <TldrawUiMenuActionItem actionId="image-replace" />
          <TldrawUiMenuActionItem actionId="flip-horizontal" />
          <TldrawUiMenuActionItem actionId="flip-vertical" />
          <TldrawUiMenuActionItem actionId="download-original" />
        </TldrawUiMenuGroup>
      ) : null}
      <TldrawUiMenuGroup id="project-select">
        <SelectAllMenuItem />
      </TldrawUiMenuGroup>
    </div>
  )
}

export function ImageEditorContextMenu(props: TLUiContextMenuProps) {
  return (
    <DefaultContextMenu {...props}>
      <ImageEditorContextMenuContent />
    </DefaultContextMenu>
  )
}
