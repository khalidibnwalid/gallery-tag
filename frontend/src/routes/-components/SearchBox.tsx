import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FadersIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";

export default function SearchBox() {
  return (
    <div className="sticky z-100 top-4 left-1/2 -translate-x-1/2 w-1/3">
      <Input
        tabIndex={1}
        startContent={<MagnifyingGlassIcon size={24} />}
        endContent={
          <Button
            variant="ghost"
            size="icon"
            className="opacity-70 hover:opacity-100"
          >
            <FadersIcon size={20} />
          </Button>
        }
        className="h-12 ps-11 backdrop-blur-xl! text-lg! text-foreground"
        size="lg"
        placeholder="Search..."
      />
    </div>
  );
}
