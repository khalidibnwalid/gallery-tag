import { Button } from '@/components/ui/button'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuSeparator,
} from '@/components/ui/context-menu'
import { useTimeout } from '@/lib/hooks/useTimeout'
import {
  useAddFolderMutation,
  useRenameFolderMutation,
  useDeleteFolderMutation,
  useCustomizeFolderMutation,
} from '@/lib/queries/folders'
import { useMoveImagesMutation } from '@/lib/queries/images'
import { useSelectionStore } from '@/lib/store/selection'
import { cn } from '@/lib/utils'
import { FolderModel } from '@main/types/models.shared'
import {
  CaretDownIcon,
  CaretRightIcon,
  FolderIcon,
  FolderPlusIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  HeartIcon,
  StarIcon,
  ImageIcon,
  VideoCameraIcon,
  UserIcon,
  UsersIcon,
  MapPinIcon,
  TagIcon,
  CalendarIcon,
  CameraIcon,
  LightbulbIcon,
  BriefcaseIcon,
  PaletteIcon,
  GlobeIcon,
  LockIcon,
} from '@phosphor-icons/react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { AlertDialog } from '@/components/ui/alert-dialog'

const FOLDER_ICONS = {
  folder: { label: 'Folder', icon: FolderIcon },
  image: { label: 'Photos', icon: ImageIcon },
  camera: { label: 'Camera', icon: CameraIcon },
  video: { label: 'Videos', icon: VideoCameraIcon },
  heart: { label: 'Favorites', icon: HeartIcon },
  star: { label: 'Star', icon: StarIcon },
  user: { label: 'Person', icon: UserIcon },
  users: { label: 'People', icon: UsersIcon },
  mappin: { label: 'Places', icon: MapPinIcon },
  tag: { label: 'Tag', icon: TagIcon },
  calendar: { label: 'Events', icon: CalendarIcon },
  lightbulb: { label: 'Ideas', icon: LightbulbIcon },
  briefcase: { label: 'Work', icon: BriefcaseIcon },
  palette: { label: 'Art', icon: PaletteIcon },
  globe: { label: 'Travel', icon: GlobeIcon },
  lock: { label: 'Private', icon: LockIcon },
} as const

const FOLDER_COLORS = [
  { name: 'Default', hex: '' },
  { name: 'Red', hex: '#ef4444' },
  { name: 'Orange', hex: '#f97316' },
  { name: 'Amber', hex: '#f59e0b' },
  { name: 'Green', hex: '#22c55e' },
  { name: 'Teal', hex: '#14b8a6' },
  { name: 'Blue', hex: '#3b82f6' },
  { name: 'Indigo', hex: '#6366f1' },
  { name: 'Purple', hex: '#a855f7' },
  { name: 'Pink', hex: '#ec4899' },
]

export default function FolderTreeNode({
  node,
  level,
  onSelect,
  selectedPath,
}: {
  node: FolderModel
  level: number
  onSelect?: (path: string | null) => void
  selectedPath?: string | null
}) {
  const addFolder = useAddFolderMutation()
  const renameFolder = useRenameFolderMutation()
  const moveImages = useMoveImagesMutation()
  const deleteFolder = useDeleteFolderMutation()
  const customizeFolder = useCustomizeFolderMutation()
  const [isDragOver, setIsDragOver] = useState(false)
  const [isOpen, setIsOpen] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isCreatingSubfolder, setIsCreatingSubfolder] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const hasChildren = node.children && node.children.length > 0

  const inputRef = useRef<HTMLInputElement>(null)
  const subfolderInputRef = useRef<HTMLInputElement>(null)

  useTimeout(
    () => {
      inputRef.current?.focus()
      inputRef.current?.select()
    },
    isEditing ? 50 : null,
  )

  useTimeout(
    () => {
      subfolderInputRef.current?.focus()
    },
    isCreatingSubfolder ? 50 : null,
  )

  const isSelected = selectedPath === node.path
  const isRoot = node.id === 1

  const onAddSubfolder = () => {
    setIsOpen(true)
    setIsCreatingSubfolder(true)
  }

  const onRenameFolder = () => setIsEditing(true)

  const handleRename = (val: string) => {
    if (val && val !== node.name) {
      renameFolder.mutate(
        { folderId: node.id, newName: val },
        {
          onSuccess: data => {
            if (selectedPath) {
              if (selectedPath === node.path) {
                onSelect?.(data.path)
              } else if (selectedPath.startsWith(node.path + '/')) {
                const relativePart = selectedPath.slice(node.path.length)
                onSelect?.(data.path + relativePart)
              } else if (selectedPath.startsWith(node.path + '\\')) {
                const relativePart = selectedPath.slice(node.path.length)
                onSelect?.(data.path + relativePart)
              }
            }
          },
        },
      )
    }
    setIsEditing(false)
  }

  return (
    <div>
      <ContextMenu>
        <ContextMenuTrigger asChild disabled={isEditing}>
          <Button
            variant={isSelected ? 'secondary' : 'ghost'}
            className={cn(
              'w-full justify-start h-9 pr-3 text-sm font-semibold rounded-md transition-all duration-150 group relative',
              isSelected && 'bg-primary! text-primary-foreground',
              isDragOver && 'bg-primary/20 ring-2 ring-primary/50',
            )}
            style={{ paddingLeft: `${level * 16 + 8}px` }}
            onClick={() => !isEditing && onSelect?.(node.path)}
            onDragOver={e => {
              e.preventDefault()
              if (!isEditing) setIsDragOver(true)
            }}
            onDragLeave={() => {
              setIsDragOver(false)
            }}
            onDrop={e => {
              e.preventDefault()
              setIsDragOver(false)
              if (isEditing) return
              try {
                const dataStr = e.dataTransfer.getData('application/json')
                if (!dataStr) return
                const payload = JSON.parse(dataStr)

                if (payload.isBulk && Array.isArray(payload.imageIds)) {
                  moveImages.mutate(
                    { imageIds: payload.imageIds, targetFolderPath: node.path },
                    {
                      onSuccess: () => {
                        toast.success(
                          `Moved ${payload.imageIds.length} images to ${node.name}`,
                        )
                        useSelectionStore.getState().clearSelection()
                      },
                      onError: (err: any) => {
                        toast.error(err.message || 'Failed to move images')
                      },
                    },
                  )
                } else if (payload.imageId) {
                  moveImages.mutate(
                    { imageIds: payload.imageId, targetFolderPath: node.path },
                    {
                      onSuccess: () => {
                        toast.success(
                          `Moved ${payload.filePath.split('/').pop()} to ${node.name}`,
                        )
                      },
                      onError: (err: any) => {
                        toast.error(err.message || 'Failed to move image')
                      },
                    },
                  )
                }
              } catch (err: any) {
                console.error(err)
                toast.error(err.message || 'Failed to move images')
              }
            }}
          >
            <span
              className="mr-1.5 cursor-pointer hover:bg-pure/20 rounded p-0.5 shrink-0"
              onClick={e => {
                e.stopPropagation()
                setIsOpen(!isOpen)
              }}
            >
              {hasChildren ? (
                isOpen ? (
                  <CaretDownIcon size={13} />
                ) : (
                  <CaretRightIcon size={13} />
                )
              ) : (
                <div className="w-[13px] h-[13px]" />
              )}
            </span>
            {(() => {
              const IconData = node.icon && FOLDER_ICONS[node.icon as keyof typeof FOLDER_ICONS]
              const IconComponent = IconData ? IconData.icon : FolderIcon
              return (
                <IconComponent
                  className={cn(
                    'mr-2 size-[18px] shrink-0',
                    isSelected ? 'text-primary-foreground' : 'text-primary',
                  )}
                  style={!isSelected && node.color ? { color: node.color } : undefined}
                  weight={isOpen || isSelected ? 'fill' : 'duotone'}
                />
              )
            })()}
            {isEditing ? (
              <input
                ref={inputRef}
                defaultValue={node.name}
                className="bg-transparent border-b border-primary text-sm font-semibold outline-none w-full py-0.5"
                onClick={e => e.stopPropagation()}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    handleRename(e.currentTarget.value.trim())
                  } else if (e.key === 'Escape') {
                    setIsEditing(false)
                  }
                }}
                onBlur={e => {
                  handleRename(e.currentTarget.value.trim())
                }}
              />
            ) : (
              <>
                <span className="truncate mr-2 min-w-0">{node.name}</span>
                <div className="ml-auto opacity-0 group-hover:opacity-100 flex items-center gap-0.5 shrink-0 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-5 hover:bg-muted/80 rounded shrink-0 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                    onClick={e => {
                      e.stopPropagation()
                      onAddSubfolder()
                    }}
                  >
                    <PlusIcon className="size-3.5" />
                  </Button>
                  {!isRoot && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-5 hover:bg-muted/80 rounded shrink-0 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                      onClick={e => {
                        e.stopPropagation()
                        onRenameFolder()
                      }}
                    >
                      <PencilIcon className="size-3.5" />
                    </Button>
                  )}
                </div>
              </>
            )}
          </Button>
        </ContextMenuTrigger>
        <ContextMenuContent onCloseAutoFocus={e => e.preventDefault()}>
          <ContextMenuItem onClick={onAddSubfolder}>
            <FolderPlusIcon className="mr-2 size-4 text-muted-foreground" />
            Add Folder
          </ContextMenuItem>
          {!isRoot && (
            <ContextMenuItem onClick={onRenameFolder}>
              <PencilIcon className="mr-2 size-4 text-muted-foreground" />
              Rename
            </ContextMenuItem>
          )}
          {!isRoot && (
            <>
              <ContextMenuSeparator />
              <ContextMenuSub>
                <ContextMenuSubTrigger>
                  <FolderIcon className="mr-2 size-4 text-muted-foreground" />
                  Change Icon
                </ContextMenuSubTrigger>
                <ContextMenuSubContent className="w-48 max-h-80 overflow-y-auto">
                  {Object.entries(FOLDER_ICONS).map(([key, item]) => {
                    const CurrentIcon = item.icon
                    return (
                      <ContextMenuItem
                        key={key}
                        onClick={() => {
                          customizeFolder.mutate({
                            folderId: node.id,
                            icon: key === 'folder' ? null : key,
                            color: node.color || null,
                          })
                        }}
                      >
                        <CurrentIcon className="mr-2 size-4 text-muted-foreground" />
                        {item.label}
                      </ContextMenuItem>
                    )
                  })}
                </ContextMenuSubContent>
              </ContextMenuSub>
              <ContextMenuSub>
                <ContextMenuSubTrigger>
                  <PaletteIcon className="mr-2 size-4 text-muted-foreground" />
                  Change Color
                </ContextMenuSubTrigger>
                <ContextMenuSubContent className="w-40">
                  {FOLDER_COLORS.map(colorItem => (
                    <ContextMenuItem
                      key={colorItem.name}
                      onClick={() => {
                        customizeFolder.mutate({
                          folderId: node.id,
                          icon: node.icon || null,
                          color: colorItem.hex || null,
                        })
                      }}
                    >
                      <span
                        className="mr-2 size-3.5 rounded-full border border-foreground/20 shrink-0"
                        style={{ backgroundColor: colorItem.hex || 'currentColor' }}
                      />
                      {colorItem.name}
                    </ContextMenuItem>
                  ))}
                </ContextMenuSubContent>
              </ContextMenuSub>
              <ContextMenuSeparator />
            </>
          )}
          {!isRoot && (
            <ContextMenuItem
              onClick={() => setIsDeleteDialogOpen(true)}
              className="text-destructive focus:text-destructive focus:bg-destructive/20"
            >
              <TrashIcon className="mr-2 size-4 text-destructive" />
              Delete
            </ContextMenuItem>
          )}
        </ContextMenuContent>
      </ContextMenu>
      {isOpen && (hasChildren || isCreatingSubfolder) && (
        <div className="mt-0.5">
          {hasChildren &&
            node.children!.map(child => (
              <FolderTreeNode
                key={child.id}
                node={child}
                level={level + 1}
                onSelect={onSelect}
                selectedPath={selectedPath}
              />
            ))}
          {isCreatingSubfolder && (
            <div
              style={{ paddingLeft: `${(level + 1) * 16 + 8}px` }}
              className="flex items-center h-9 pr-3"
            >
              <span className="mr-1.5 w-[13px] h-[13px] shrink-0" />
              <FolderIcon
                className="mr-2 size-[18px] text-primary"
                weight="fill"
              />
              <input
                ref={subfolderInputRef}
                placeholder="New subfolder..."
                className="bg-transparent border-b border-primary text-sm font-semibold outline-none w-full py-0.5"
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    const val = e.currentTarget.value.trim()
                    if (val)
                      addFolder.mutate({
                        parentPath: node.path,
                        folderName: val,
                      })
                    setIsCreatingSubfolder(false)
                  } else if (e.key === 'Escape') {
                    setIsCreatingSubfolder(false)
                  }
                }}
                onBlur={e => {
                  const val = e.currentTarget.value.trim()
                  if (val)
                    addFolder.mutate({ parentPath: node.path, folderName: val })
                  setIsCreatingSubfolder(false)
                }}
              />
            </div>
          )}
        </div>
      )}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Delete Folder"
        description={`Are you sure you want to delete the folder "${node.name}" and all its contents? This will move it to the trash.`}
        actionLabel="Delete Folder"
        onAction={() => {
          deleteFolder.mutate(node.id, {
            onSuccess: () => {
              if (
                selectedPath &&
                (selectedPath === node.path ||
                  selectedPath.startsWith(node.path + '/') ||
                  selectedPath.startsWith(node.path + '\\'))
              ) {
                onSelect?.(null)
              }
              setIsDeleteDialogOpen(false)
            },
          })
        }}
      />
    </div>
  )
}
