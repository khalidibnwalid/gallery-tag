import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { Input } from '@/components/ui/input'
import { FadersIcon, MagnifyingGlassIcon, XIcon } from '@phosphor-icons/react'

export default function TopBar() {
  return (
    <div className="absolute z-50 top-3 left-3 right-3 px-4 h-12 w-auto flex items-center justify-between">
      <div className="backdrop-blur-3xl rounded-xl">
        <ButtonGroup>
          <Button variant="outline">File</Button>
          <Button variant="outline">Edit</Button>
          <Button variant="outline">View</Button>
          <Button variant="outline">Help</Button>
        </ButtonGroup>
      </div>
      <div className="w-1/3 backdrop-blur-3xl rounded-xl absolute left-1/2 -translate-x-1/2">
        <Input
          tabIndex={1}
          startContent={
            <MagnifyingGlassIcon size={24} className="backdrop-blur-none" />
          }
          endContent={
            <Button
              variant="ghost"
              size="icon"
              className="opacity-70 hover:opacity-100 backdrop-blur-none"
            >
              <FadersIcon size={20} color="currentColor" />
            </Button>
          }
          className="h-12 ps-11 text-lg! text-foreground bg-background/70!"
          size="lg"
          placeholder="Search..."
        />
      </div>
      <div className="flex-1"></div>
      <div>
        <Button variant="outline" size="icon" className="backdrop-blur-3xl">
          <XIcon size={20} color="currentColor" />
        </Button>
      </div>
    </div>
  )
}
