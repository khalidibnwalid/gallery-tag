import { useFolder } from '@/components/providers/FolderProvider'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Spinner } from '@/components/ui/spinner'
import { XIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import SearchBar from './SearchBar'

export default function TopBar() {
  return (
    <div className="absolute z-50 top-3 left-3 right-3 px-4 h-12 w-auto flex items-center justify-between gap-3">
      <ButtonGroup className="backdrop-blur-3xl bg-background/70 rounded-md overflow-hidden">
        <FileDropDown />
        <Button variant="outline">Edit</Button>
        <Button variant="outline">View</Button>
        <Button variant="outline">Help</Button>
      </ButtonGroup>
      <TopTitle />
      <div className="w-1/3 backdrop-blur-3xl rounded-xl absolute left-1/2 -translate-x-1/2">
        <SearchBar />
      </div>
      <div className="flex-1"></div>
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
  const [loading, setLoading] = useState(false)
  const { openFolderDialog } = useFolder()

  async function openFolder() {
    setLoading(true)
    await openFolderDialog()
    setLoading(false)
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">File</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-56 bg-background/70 backdrop-blur-3xl"
        align="start"
        onClick={openFolder}
      >
        <DropdownMenuItem disabled={loading}>
          {loading && <Spinner />}
          Open Folder...
          <DropdownMenuShortcut>⇧⌘O</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function TopTitle() {
  const { folderPath, paginatedImagesQuery } = useFolder()
  const { isLoading, data } = paginatedImagesQuery
  if (!folderPath) return null

  return (
    <div
      className="items-center gap-1 max-w-1/3 xl:flex hidden"
      title={folderPath}
    >
      <Button
        variant="outline"
        className="cursor-default bg-background/70! backdrop-blur-3xl"
      >
        <span className="w-full overflow-hidden font-bold ">
          /{folderPath.split('/').pop()}
        </span>
      </Button>
      <Button
        variant="outline"
        className="cursor-default bg-background/70! backdrop-blur-3xl px-2"
      >
        {isLoading ? (
          <Spinner />
        ) : (
          <span className="w-full overflow-hidden font-bold ">
            {data?.pages.flat().length.toLocaleString() || 0} Loaded
          </span>
        )}
      </Button>
    </div>
  )
}
