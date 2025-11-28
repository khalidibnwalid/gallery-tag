import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FadersIcon, MagnifyingGlassIcon } from '@phosphor-icons/react'

export default function SearchBox() {
  return (
    <div className="sticky z-100 top-3 left-1/2 -translate-x-1/2 w-1/3 backdrop-blur-3xl rounded-xl">
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
  )
}
