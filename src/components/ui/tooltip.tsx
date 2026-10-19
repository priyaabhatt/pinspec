import * as React from 'react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { cn } from '@/lib/utils'
import { usePortalContainer } from './portal'

export const TooltipProvider = TooltipPrimitive.Provider

export function Tooltip({
  label,
  shortcut,
  side = 'top',
  children,
}: {
  label: string
  shortcut?: string
  side?: 'top' | 'bottom' | 'left' | 'right'
  children: React.ReactNode
}) {
  const container = usePortalContainer()
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal container={container}>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          className={cn('z-50 flex items-center gap-2 rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground shadow-md')}
        >
          {label}
          {shortcut && <kbd className="font-sans text-[11px] text-primary-foreground/60">{shortcut}</kbd>}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}
