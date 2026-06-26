import { Button } from '@/components/ui/button'
import { FolderOpenIcon, XIcon } from '@phosphor-icons/react'
import { useFolder } from '@/components/providers/FolderProvider'

export function NoFolderLanding() {
  const { openFolderDialog, recentFolders, openFolder, removeRecentFolder } =
    useFolder()

  return (
    <div className="text-center py-12 max-w-xl mx-auto space-y-8 animate-fade-in">
      <div className="space-y-4">
        <h2 className="text-foreground text-3xl font-extrabold tracking-tight">
          No Folder Opened
        </h2>
        <p className="text-muted-foreground text-md max-w-sm mx-auto">
          Open a folder to start scanning and organizing your image gallery.
        </p>
        <Button
          size="lg"
          className="text-lg px-6 h-12"
          onClick={openFolderDialog}
        >
          <FolderOpenIcon className="size-5 mr-2" weight="fill" />
          Open Folder
        </Button>
      </div>

      {recentFolders?.length > 0 && (
        <div className="space-y-4 text-left border border-border/40 bg-card/30 rounded-2xl p-6 backdrop-blur-md shadow-lg">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Recently Opened Folders
          </h3>
          <div className="divide-y divide-border/20 max-h-80 overflow-y-auto overflow-x-hidden pr-1">
            {recentFolders?.map(path => {
              const folderName = path.split('/').pop() || path
              return (
                <div
                  key={path}
                  onClick={() => openFolder(path)}
                  className="group flex items-center justify-between p-3 rounded-xl hover:bg-accent/40 cursor-pointer transition-all duration-200"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-105 transition-transform duration-200">
                      <FolderOpenIcon className="size-6" weight="duotone" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-foreground truncate text-sm">
                        {folderName}
                      </p>
                      <p
                        className="text-xs text-muted-foreground truncate"
                        title={path}
                      >
                        {path}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 opacity-0 group-hover:opacity-100 hover:bg-destructive/15 hover:text-destructive transition-all duration-200"
                    onClick={e => {
                      e.stopPropagation()
                      removeRecentFolder(path)
                    }}
                  >
                    <XIcon className="size-4" weight="bold" />
                  </Button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
