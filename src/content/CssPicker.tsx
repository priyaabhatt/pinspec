import { useMemo, useRef, useState } from 'react'
import { Braces } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip } from '@/components/ui/tooltip'
import { classList, describeValue, readStyles } from './styles'
import { readDesignSystem } from './tokens'

interface Props {
  el: Element | null
  open: boolean
  onOpenChange: (open: boolean) => void
  taken: Set<string>
  onAdd: (prop: string) => void
}

/** { } — the element's non-default styles, like Figma's "+ Property". */
export function CssPicker({ el, open, onOpenChange, taken, onAdd }: Props) {
  const [filter, setFilter] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const added = useRef(false)
  const groups = useMemo(() => (el && open ? readStyles(el) : []), [el, open])
  const ds = useMemo(() => (open ? readDesignSystem() : null), [open])
  const classes = el ? classList(el) : []

  const q = filter.trim().toLowerCase()
  const shown = groups
    .map((g) => ({ ...g, entries: g.entries.filter((e) => !taken.has(e.prop) && (!q || e.prop.includes(q))) }))
    .filter((g) => g.entries.length)
  const custom =
    q && !shown.some((g) => g.entries.some((e) => e.prop === q)) && !taken.has(q) && CSS.supports(q, 'initial') ? q : null
  const first = shown[0]?.entries[0]?.prop ?? custom

  const add = (prop: string) => {
    added.current = true
    onAdd(prop)
    setFilter('')
    onOpenChange(false)
  }

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
        onCloseAutoFocus={(e) => {
          // A new row focuses its own after input; don't steal it back.
          if (added.current) e.preventDefault()
          added.current = false
        }}
        className="flex max-h-[min(420px,var(--radix-popover-content-available-height))] w-[320px] flex-col overflow-hidden p-0">
        <div className="border-b p-2">
          <input
            ref={inputRef}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && first) {
                e.preventDefault()
                add(first)
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
              onClick={() => add(custom)}
              className="flex w-full items-center rounded px-2 py-1.5 text-left font-mono text-xs hover:bg-accent"
            >
              Add <span className="ml-1 font-semibold">{custom}</span>
            </button>
          )}
          {shown.map((g) => (
            <div key={g.name} className="pb-1">
              <div className="px-2 pt-2 pb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{g.name}</div>
              {g.entries.map((e) => {
                const d = ds ? describeValue(e.prop, e.value, ds) : { text: e.value }
                return (
                  <button
                    key={e.prop}
                    type="button"
                    onClick={() => add(e.prop)}
                    className="flex w-full items-baseline gap-3 rounded px-2 py-1 text-left font-mono text-xs hover:bg-accent"
                  >
                    <span className="shrink-0">{e.prop}</span>
                    <span className="ml-auto truncate text-muted-foreground" title={e.value}>
                      {d.token ?? d.text}
                    </span>
                  </button>
                )
              })}
            </div>
          ))}
          {!shown.length && !custom && <div className="px-2 py-3 text-xs text-muted-foreground">No matching properties</div>}
        </div>
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
