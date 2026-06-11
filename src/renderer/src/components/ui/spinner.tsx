import { cn } from '@/lib/utils'
import { CircleDashedIcon } from '@phosphor-icons/react'

function Spinner({ className, ...props }: React.ComponentProps<'svg'>) {
  return (
    <CircleDashedIcon
      role="status"
      aria-label="Loading"
      className={cn('size-4 animate-spin', className)}
      {...props}
    />
  )
}

export { Spinner }
