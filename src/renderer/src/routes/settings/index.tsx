import { createFileRoute } from '@tanstack/react-router'
import { useFolder } from '@/components/providers/FolderProvider'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { GearIcon, KeyboardIcon } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { NoFolderLanding } from '../-components/NoFolderLanding'
import { ThumbnailSettingsCard } from './-components/ThumbnailSettingsCard'
import { AiSearchSettingsCard } from './-components/AiSearchSettingsCard'
import { KeybindingsSettingsCard } from './-components/KeybindingsSettingsCard'
import { useState } from 'react'

export const Route = createFileRoute('/settings/')({
  component: ComponentPage,
})

function ComponentPage() {
  const { folderPath } = useFolder()

  if (!folderPath) {
    return (
      <div className="flex h-full overflow-hidden justify-center items-center">
        <ScrollArea className="flex-1 h-full">
          <div className="p-6 pt-20 pb-24">
            <NoFolderLanding />
          </div>
        </ScrollArea>
      </div>
    )
  }

  return <SettingsContent folderPath={folderPath} />
}

function SettingsContent({ folderPath }: { folderPath: string }) {
  const [activeTab, setActiveTab] = useState<'general' | 'keybindings'>('general')

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Left Navigation Panel */}
      <div className="w-64 border-r border-border/40 p-6 pt-20 hidden md:flex flex-col gap-1 bg-card/10">
        <div className="px-3 mb-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Settings
          </h2>
        </div>

        <Button
          variant={activeTab === 'general' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('general')}
          className={cn(
            'w-full justify-start h-9 pr-3 text-sm font-semibold rounded-md transition-all duration-150 cursor-pointer',
            activeTab === 'general' && 'bg-primary! text-primary-foreground',
          )}
        >
          <GearIcon className="size-5" weight={activeTab === 'general' ? 'fill' : 'regular'} />
          General
        </Button>

        <Button
          variant={activeTab === 'keybindings' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('keybindings')}
          className={cn(
            'w-full justify-start h-9 pr-3 text-sm font-semibold rounded-md transition-all duration-150 cursor-pointer',
            activeTab === 'keybindings' && 'bg-primary! text-primary-foreground',
          )}
        >
          <KeyboardIcon className="size-5" weight={activeTab === 'keybindings' ? 'fill' : 'regular'} />
          Keybindings
        </Button>
      </div>

      {/* Right Content Panel */}
      <ScrollArea className="flex-1 h-full">
        <div className="p-6 pt-20 pb-24 max-w-3xl mx-auto space-y-8 animate-fade-in">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
              Settings
            </h1>
            <p className="text-muted-foreground text-sm">
              {activeTab === 'general'
                ? 'Manage your gallery preferences, image compression quality, and AI model search parameters.'
                : 'Configure keyboard shortcuts to navigate the application quickly.'}
            </p>
          </div>

          <hr className="border-border/60" />

          {activeTab === 'general' ? (
            <>
              <ThumbnailSettingsCard folderPath={folderPath} />
              <AiSearchSettingsCard folderPath={folderPath} />
            </>
          ) : (
            <KeybindingsSettingsCard />
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
