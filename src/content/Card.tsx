import { useLayoutEffect, useRef, useState } from 'react'
import { Copy, ImagePlus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip } from '@/components/ui/tooltip'
import { snapValue, type DesignSystem } from '@/lib/snap'
import { cn } from '@/lib/utils'
import { CssPicker } from './CssPicker'
import { parseColor, remPx } from './env'
import { describeValue } from './styles'
import type { AfterImage, Row } from './types'

interface Props {
  el: Element
  /** Screenshot of the selected element, taken when it was picked. */
  beforeUrl: string
  rect: DOMRect
  ds: DesignSystem
  comment: string
  onComment: (v: string) => void
  after: AfterImage | null
  onAfterFile: (file: File) => void
  onClearAfter: () => void
  rows: Row[]
  onAddRow: (prop: string) => number
  onRow: (id: number, patch: Partial<Row>) => void
  onRemoveRow: (id: number) => void
  pickerOpen: boolean
  onPickerOpen: (open: boolean) => void
  busy: boolean
  onRemove: () => void
  onCancel: () => void
  onCopy: () => void
}

const CARD_W = 560
const MARGIN = 10
/** Room kept free at the bottom for the floating toolbar. */
const TOOLBAR_ROOM = 72

function place(rect: DOMRect, h: number) {
  const vw = window.innerWidth
  const vh = window.innerHeight - TOOLBAR_ROOM
  const left = Math.min(Math.max(MARGIN, rect.left), vw - CARD_W - MARGIN)
  if (rect.bottom + MARGIN + h <= vh - MARGIN) return { left, top: rect.bottom + MARGIN }
  if (rect.top - MARGIN - h >= MARGIN) return { left, top: rect.top - MARGIN - h }
  if (rect.right + MARGIN + CARD_W <= vw - MARGIN) {
    return { left: rect.right + MARGIN, top: Math.min(Math.max(MARGIN, rect.top), vh - h - MARGIN) }
  }
  if (rect.left - MARGIN - CARD_W >= MARGIN) {
    return { left: rect.left - MARGIN - CARD_W, top: Math.min(Math.max(MARGIN, rect.top), vh - h - MARGIN) }
  }
  return { left: vw - CARD_W - MARGIN, top: Math.max(MARGIN, vh - h - MARGIN) }
}

/** The annotation card, attached to the selected element like a Figma annotation. */
export function Card(p: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const commentRef = useRef<HTMLTextAreaElement>(null)
  const [height, setHeight] = useState(220)
  const [focusRow, setFocusRow] = useState<number | null>(null)

  useLayoutEffect(() => {
    if (ref.current) setHeight(ref.current.offsetHeight)
  })
  useLayoutEffect(() => {
    commentRef.current?.focus({ preventScroll: true })
  }, [p.el])

  const pos = place(p.rect, height)
  const canCopy = p.comment.trim().length > 0 && !p.busy

  // ⌘V anywhere in the card: images go to the after slot, even while the
  // comment has focus; text goes into the comment.
  const onPaste = (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items)
    const image = items.find((i) => i.kind === 'file' && i.type.startsWith('image/'))
    if (image) {
      const file = image.getAsFile()
      if (file) {
        e.preventDefault()
        p.onAfterFile(file)
      }
      return
    }
    const target = e.target as HTMLElement
    if (target.closest('input, textarea')) return
    const text = e.clipboardData.getData('text/plain')
    if (text) {
      e.preventDefault()
      p.onComment(p.comment ? `${p.comment} ${text}` : text)
      commentRef.current?.focus()
    }
  }

  return (
    <div
      ref={ref}
      tabIndex={-1}
      onPaste={onPaste}
      onMouseDown={(e) => {
        // Keep focus inside the card so ⌘V lands here.
        if (!(e.target as Element).closest('input, textarea, button')) {
          e.preventDefault()
          ref.current?.focus({ preventScroll: true })
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && canCopy) {
          e.preventDefault()
          p.onCopy()
        } else if (e.key === 'Backspace' && !(e.target as Element).closest('input, textarea')) {
          e.preventDefault()
          p.onRemove()
        }
      }}
      className="pointer-events-auto fixed z-30 flex flex-col rounded-xl border bg-card text-card-foreground shadow-xl outline-none"
      style={{ left: pos.left, top: pos.top, width: CARD_W }}
    >
      <div className="flex flex-col gap-2 p-3">
        <div className="flex gap-3">
          <BeforeSlot url={p.beforeUrl} />
          <AfterSlot after={p.after} onClear={p.onClearAfter} />
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <textarea
            ref={commentRef}
            value={p.comment}
            onChange={(e) => p.onComment(e.target.value)}
            rows={3}
            placeholder="What should change? Type or dictate."
            className="field-sizing-content min-h-[76px] w-full resize-none rounded-md border-0 bg-transparent p-1 text-sm leading-relaxed outline-none placeholder:text-muted-foreground"
          />
          {p.rows.length > 0 && (
            <div className="flex flex-col gap-1.5 border-t pt-2">
              {p.rows.map((r) => (
                <CssRow
                  key={r.id}
                  row={r}
                  ds={p.ds}
                  autoFocus={focusRow === r.id}
                  onChange={(patch) => p.onRow(r.id, patch)}
                  onRemove={() => p.onRemoveRow(r.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 border-t px-2 py-1.5">
        <Tooltip label="Cancel" shortcut="Esc">
          <Button variant="ghost" size="icon-sm" aria-label="Cancel" onClick={p.onCancel}>
            <X />
          </Button>
        </Tooltip>
        <CssPicker
          el={p.el}
          open={p.pickerOpen}
          onOpenChange={p.onPickerOpen}
          taken={new Set(p.rows.map((r) => r.prop))}
          onAdd={(prop) => setFocusRow(p.onAddRow(prop))}
        />
        <div className="ml-auto">
          <Tooltip label={canCopy ? 'Copy image and finish' : 'Write a comment first'} shortcut="⌘↵">
            <span tabIndex={canCopy ? undefined : 0}>
              <Button size="sm" aria-label="Copy" disabled={!canCopy} onClick={p.onCopy}>
                <Copy className="size-3.5" />
                {p.busy ? 'Copying…' : 'Copy'}
              </Button>
            </span>
          </Tooltip>
        </div>
      </div>
    </div>
  )
}

const SLOT = 'relative flex h-[132px] min-w-0 flex-1 items-center justify-center overflow-hidden rounded-lg border'

function SlotLabel({ children }: { children: string }) {
  return (
    <span className="absolute top-1.5 left-1.5 rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase shadow-sm">
      {children}
    </span>
  )
}

function BeforeSlot({ url }: { url: string }) {
  return (
    <div className={cn(SLOT, 'bg-muted p-2')}>
      <img src={url} alt="Before" className="max-h-full max-w-full object-contain" />
      <SlotLabel>Before</SlotLabel>
    </div>
  )
}

function AfterSlot({ after, onClear }: { after: AfterImage | null; onClear: () => void }) {
  if (after) {
    return (
      <div className={cn(SLOT, 'group bg-muted p-2')}>
        <img src={after.url} alt="After" className="max-h-full max-w-full object-contain" />
        <SlotLabel>After</SlotLabel>
        <button
          type="button"
          aria-label="Remove after image"
          onClick={onClear}
          className="absolute top-1 right-1 rounded-full bg-background/90 p-0.5 opacity-0 shadow group-hover:opacity-100"
        >
          <X className="size-3.5" />
        </button>
      </div>
    )
  }
  return (
    <div className={cn(SLOT, 'flex-col gap-1.5 border-dashed bg-muted/50 text-center text-muted-foreground')}>
      <ImagePlus className="size-5" />
      <div className="text-xs font-medium">Paste after image</div>
      <kbd className="rounded border bg-background px-1.5 py-0.5 font-sans text-[11px]">⌘V</kbd>
    </div>
  )
}

function CssRow({
  row,
  ds,
  autoFocus,
  onChange,
  onRemove,
}: {
  row: Row
  ds: DesignSystem
  autoFocus: boolean
  onChange: (patch: Partial<Row>) => void
  onRemove: () => void
}) {
  const before = describeValue(row.prop, row.before, ds)
  const snap = row.after.trim() ? snapValue(row.prop, row.after, ds, parseColor, remPx()) : null
  return (
    <div className="font-mono text-xs">
      <div className="flex items-center gap-2">
        <span className="w-[108px] shrink-0 truncate font-medium" title={row.prop}>
          {row.prop}
        </span>
        <span className="min-w-0 flex-1 truncate text-muted-foreground" title={row.before}>
          {before.token ?? before.text}
        </span>
        <span className="text-muted-foreground">→</span>
        <input
          autoFocus={autoFocus}
          value={row.after}
          onChange={(e) => onChange({ after: e.target.value })}
          placeholder="after"
          spellCheck={false}
          className="h-6 w-[96px] shrink-0 rounded border bg-background px-1.5 outline-none focus:ring-2 focus:ring-highlight/40"
        />
        <button type="button" aria-label={`Remove ${row.prop}`} onClick={onRemove} className="text-muted-foreground hover:text-foreground">
          <X className="size-3.5" />
        </button>
      </div>
      {snap && (
        <div className="mt-0.5 flex items-center justify-end gap-1.5 pr-[22px] text-[11px]">
          <span className={cn('truncate', row.exact ? 'text-muted-foreground line-through' : 'text-highlight')}>
            {snap.exact ? snap.token : `${snap.token} (${snap.value})`}
          </span>
          <button
            type="button"
            onClick={() => onChange({ exact: !row.exact })}
            className={cn(
              'rounded border px-1 leading-4',
              row.exact ? 'border-foreground bg-foreground text-background' : 'text-muted-foreground hover:text-foreground',
            )}
            title={row.exact ? 'Using the typed value. Click to snap to the system.' : 'Snapped to the system. Click to use the exact value.'}
          >
            exact
          </button>
        </div>
      )}
    </div>
  )
}
