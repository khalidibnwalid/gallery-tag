'use client'

import * as React from 'react'
import { Switch as SwitchPrimitive } from 'radix-ui'

import { cn } from '@/lib/utils'

function Switch({
  className,
  size = 'default',
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: 'sm' | 'default'
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        'peer group/switch relative inline-flex shrink-0 items-center rounded-full border border-transparent transition-colors outline-none cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 p-0.5',
        'data-[size=default]:h-5 data-[size=default]:w-9',
        'data-[size=sm]:h-4 data-[size=sm]:w-7',
        'data-[state=checked]:bg-primary data-[state=unchecked]:bg-border dark:data-[state=unchecked]:bg-muted',
        'data-disabled:cursor-not-allowed data-disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          'pointer-events-none block rounded-full bg-background shadow-sm ring-0 transition-transform',
          'group-data-[size=default]/switch:size-4 group-data-[size=sm]/switch:size-3',
          'group-data-[state=checked]/switch:group-data-[size=default]/switch:translate-x-4',
          'group-data-[state=checked]/switch:group-data-[size=sm]/switch:translate-x-3',
          'group-data-[state=unchecked]/switch:translate-x-0 group-data-[state=unchecked]/switch:bg-primary',
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
