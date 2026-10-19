import { useMemo, useRef, useState } from 'react'
import { Braces, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { DesignSystem } from '@/lib/designSystem'
import { classList, readStyles } from './styles'

interface Props {
  el: Element | null
  /** The pin's design system snapshot, so names match the card and the image. */
  ds: DesignSystem
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Properties that already have a row; shown ticked. */
  checked: Set<string>
  onToggle: (prop: string, checked: boolean) => void
}

/**
 * { } — the element's non-default styles, like Figma's "+ Property".
 * Tick any number of properties; each ticked one becomes a CSS row.
 */
export function CssPicker({ el, ds, open, onOpenChange, checked, onToggle }: Props) {
  const [filter, setFilter] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const groups = useMemo(() => (el && open ? readStyles(el) : []), [el, open])
  const classes = el ? classList(el) : []

  const q = filter.trim().toLowerCase()
  const shown = groups
    .map((g) => ({ ...g, entries: g.entries.filter((e) => !q || e.prop.includes(q)) }))
    .filter((g) => g.entries.length)
  const custom =
    q && !shown.some((g) => g.entries.some((e) => e.prop === q)) && !checked.has(q) && CSS.supports(q, 'initial') ? q : null
  const first = shown[0]?.entries[0]?.prop ?? custom

  const toggle = (prop: string) => onToggle(prop, !checked.has(prop))

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (!o) setFilter('')
      }}
    >
      <Tooltip label="Add CSS property">
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Add CSS property" disabled={!el}>
            <Braces />
          </Button>
        </PopoverTrigger>
      </Tooltip>
      <PopoverContent
        side="top"
        collisionPadding={8}
        onOpenAutoFocus={(e) => {
          e.preventDefault()
          inputRef.current?.focus()
        }}
        // The card focuses the first new row's after input on close.
        onCloseAutoFocus={(e) => e.preventDefault()}
        className="flex max-h-[min(420px,var(--radix-popover-content-available-height))] w-[320px] flex-col overflow-hidden p-0">
        <div className="border-b p-2">
          <input
            ref={inputRef}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && first) {
                e.preventDefault()
                toggle(first)
                setFilter('')
              }
            }}
            placeholder="Filter, or type any property"
            className="h-8 w-full rounded-md border bg-background px-2 font-mono text-xs outline-none focus:ring-2 focus:ring-ring/40"
          />
        </div>
        <div className="overflow-y-auto p-1">
          {custom && (
            <button
              type="button"
              onClick={() => {
                toggle(custom)
                setFilter('')
              }}
              className="flex w-full items-center rounded px-2 py-1.5 text-left font-mono text-xs hover:bg-accent"
            >
              Add <span className="ml-1 font-semibold">{custom}</span>
            </button>
          )}
          {shown.map((g) => (
            <div key={g.name} className="pb-1">
              <div className="px-2 pt-2 pb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{g.name}</div>
              {g.entries.map((e) => {
                const shown = ds.nameBefore(e.prop, e.value, classes)
                const on = checked.has(e.prop)
                return (
                  <button
                    key={e.prop}
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    onClick={() => toggle(e.prop)}
                    className="flex w-full items-center gap-2 rounded px-2 py-1 text-left font-mono text-xs hover:bg-accent"
                  >
                    <span
                      className={cn(
                        'flex size-3.5 shrink-0 items-center justify-center rounded-[3px] border border-muted-foreground/50',
                        on && 'border-highlight bg-highlight text-white',
                      )}
                    >
                      {on && <Check className="size-3" strokeWidth={3} />}
                    </span>
                    <span className="shrink-0">{e.prop}</span>
                    <span className="ml-auto truncate text-muted-foreground" title={e.value}>
                      {shown}
                    </span>
                  </button>
                )
              })}
            </div>
          ))}
          {!shown.length && !custom && <div className="px-2 py-3 text-xs text-muted-foreground">No matching properties</div>}
        </div>
        {checked.size > 0 && (
          <div className="flex items-center justify-between border-t px-3 py-1.5 text-xs text-muted-foreground">
            {checked.size} selected
            <button type="button" onClick={() => onOpenChange(false)} className="font-medium text-foreground hover:underline">
              Done
            </button>
          </div>
        )}
        {classes.length > 0 && (
          <div className="max-h-24 overflow-y-auto border-t p-2">
            <div className="pb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Classes</div>
            <div className="flex flex-wrap gap-1">
              {classes.map((c) => (
                <span key={c} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
