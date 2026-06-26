import { useFolder } from '@/components/providers/FolderProvider'
import { useSearch } from '@/components/providers/SearchProvider'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Spinner } from '@/components/ui/spinner'
import { useInfiniteImages } from '@/lib/queries/images'
import { cn } from '@/lib/utils'
import { XIcon, PlusIcon } from '@phosphor-icons/react'
import SearchBar from './SearchBar'

export default function TopBar() {
  const { isSearchDragging, aiSearchImage } = useSearch()

  return (
    <div className="absolute z-50 top-3 left-3 right-3 px-4 h-12 w-auto flex items-center justify-between gap-3">
      <ButtonGroup className="backdrop-blur-3xl bg-background/70 rounded-md overflow-hidden shrink-0">
        <FileDropDown />
        {/* <Button variant="outline">Edit</Button>
        <Button variant="outline">View</Button>
        <Button variant="outline">Help</Button> */}
      </ButtonGroup>
      <FolderTabs />
      <div
        className={cn(
          'backdrop-blur-3xl rounded-xl absolute top-0 left-1/2 -translate-x-1/2 transition-all duration-300 w-1/3',
          (isSearchDragging || aiSearchImage) &&
            'shadow-lg shadow-indigo-500/5',
        )}
      >
        <SearchBar />
      </div>
      <div className="flex-1"></div>
      <ActiveImageCount />
      <div>
        <Button
          variant="outline"
          size="icon"
          className="backdrop-blur-3xl bg-background/70!"
          onClick={() => window.api.system.closeApp()}
        >
          <XIcon size={20} color="currentColor" />
        </Button>
      </div>
    </div>
  )
}

function FileDropDown() {
  const { setRecentFoldersOpen, recentFolders, openFolder } = useFolder()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">File</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-56 bg-background/70 backdrop-blur-3xl"
        align="start"
      >
        <DropdownMenuItem onSelect={() => setRecentFoldersOpen(true)}>
          Open Folder...
          <DropdownMenuShortcut>⌘O</DropdownMenuShortcut>
        </DropdownMenuItem>

        {recentFolders.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Open Recent</DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent className="w-72 bg-background/80 backdrop-blur-3xl">
                  {recentFolders.map(path => {
                    const name = path.split('/').pop() || path
                    return (
                      <DropdownMenuItem
                        key={path}
                        onSelect={() => openFolder(path)}
                      >
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold truncate">{name}</span>
                          <span
                            className="text-xs text-muted-foreground truncate"
                            title={path}
                          >
                            {path}
                          </span>
                        </div>
                      </DropdownMenuItem>
                    )
                  })}
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function FolderTabs() {
  const { folderPath, tabs, closeTab, openFolderDialog, openFolder } =
    useFolder()

  if (!tabs || tabs.length === 0) return null

  return (
    <div className="flex items-center gap-1.5 max-w-[32vw] overflow-x-auto no-scrollbar scroll-smooth py-1 px-0.5 select-none xl:flex hidden">
      {tabs.map(path => {
        const name = path.split('/').pop() || path
        const isActive = path === folderPath
        return (
          <div
            key={path}
            onClick={() => {
              if (!isActive) {
                openFolder(path)
              }
            }}
            className={cn(
              'group backdrop-blur-3xl  relative flex items-center gap-2 px-3 h-9 rounded-md border text-xs font-bold cursor-pointer transition-all duration-200',
              isActive
                ? 'bg-primary/80 text-background border-primary/30 shadow-xs'
                : 'bg-background/70 hover:bg-background/80 text-muted-foreground border-border/40 hover:text-foreground hover:border-border',
            )}
            title={path}
          >
            <span className="truncate max-w-[120px]">/{name}</span>
            <button
              type="button"
              onClick={e => {
                e.stopPropagation()
                closeTab(path)
              }}
              className="opacity-0 group-hover:opacity-100 hover:bg-muted p-0.5 rounded-md transition-all shrink-0 ml-1 animate-fade-in"
            >
              <XIcon size={12} weight="bold" />
            </button>
          </div>
        )
      })}

      <Button
        variant="default"
        size="icon"
        className="size-8 h-9 shrink-0 backdrop-blur-3xl bg-background/70! text-primary hover:bg-background/80 border-border/40"
        onClick={openFolderDialog}
        title="Open folder in new tab"
      >
        <PlusIcon size={14} weight="bold" />
      </Button>
    </div>
  )
}

function ActiveImageCount() {
  const { folderPath } = useFolder()
  const { filter } = useSearch()

  const { isLoading, data } = useInfiniteImages(
    folderPath ?? undefined,
    50,
    filter,
  )

  if (!folderPath) return null

  const totalCount = data?.pages[0]?.total ?? 0

  return (
    <Button
      variant="outline"
      className="cursor-default bg-background/70! backdrop-blur-3xl px-3 xl:flex hidden shrink-0 h-9"
    >
      {isLoading ? (
        <Spinner />
      ) : (
        <span className="w-full overflow-hidden font-bold">
          {totalCount.toLocaleString()} Images
        </span>
      )}
    </Button>
  )
}
