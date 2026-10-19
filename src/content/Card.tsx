import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Copy, ImagePlus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip } from '@/components/ui/tooltip'
import type { CssRow, ResolvedRow } from '@/lib/cssRow'
import type { DesignSystem } from '@/lib/designSystem'
import { cn } from '@/lib/utils'
import { CssPicker } from './CssPicker'
import type { AfterImage } from '@/lib/pin'
import { onPinspecPaste } from './pasteRouter'

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
  rows: CssRow[]
  resolved: Map<number, ResolvedRow>
  onAddRow: (prop: string) => number
  onRow: (id: number, patch: Partial<CssRow>) => void
  onRemoveRow: (id: number) => void
  pickerOpen: boolean
  onPickerOpen: (open: boolean) => void
  busy: boolean
  canCopy: boolean
  onRemove: () => void
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

  // ⌘V anywhere in pinspec while the card is open (the card, the { } picker,
  // the toolbar): images go to the after slot, even while the comment has
  // focus; text goes where the cursor is, or into the comment. The paste
  // router delivers it here before the page's own paste handlers.
  const latest = useRef(p)
  latest.current = p
  useEffect(
    () =>
      onPinspecPaste((e, target) => {
        const p = latest.current
        const data = e.clipboardData
        if (!data) return
        const image = Array.from(data.items).find((i) => i.kind === 'file' && i.type.startsWith('image/'))
        const file = image?.getAsFile()
        if (file) {
          e.preventDefault()
          p.onAfterFile(file)
          return
        }
        const text = data.getData('text/plain')
        if (!text) return
        if (target.closest('input, textarea')) {
          // A page handler that ran first may still have cancelled the default
          // insertion; insert the text ourselves then.
          if (e.defaultPrevented) document.execCommand('insertText', false, text)
          return
        }
        e.preventDefault()
        p.onComment(p.comment ? `${p.comment} ${text}` : text)
        commentRef.current?.focus()
      }),
    [],
  )

  return (
    <div
      ref={ref}
      tabIndex={-1}
      onMouseDown={(e) => {
        // Keep focus inside the card so ⌘V lands here.
        if (!(e.target as Element).closest('input, textarea, button')) {
          e.preventDefault()
          ref.current?.focus({ preventScroll: true })
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && p.canCopy) {
          e.preventDefault()
          p.onCopy()
        } else if (e.key === 'Backspace' && !(e.target as Element).closest('input, textarea')) {
          e.preventDefault()
          p.onRemove()
        }
      }}
      className="pointer-events-auto fixed z-30 flex flex-col rounded-xl border bg-card text-card-foreground shadow-float outline-none"
      style={{ left: pos.left, top: pos.top, width: CARD_W }}
    >
      <div className="flex flex-col gap-2 p-3">
        <div className="flex gap-3">
          <BeforeSlot url={p.beforeUrl} tagged={!!p.after} />
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
                <CssRowEditor
                  key={r.id}
                  row={r}
                  view={p.resolved.get(r.id)!}
                  focus={focusRow === r.id}
                  onFocused={() => setFocusRow(null)}
                  onChange={(patch) => p.onRow(r.id, patch)}
                  onRemove={() => p.onRemoveRow(r.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 border-t px-2 py-1.5">
        <CssPicker
          el={p.el}
          ds={p.ds}
          open={p.pickerOpen}
          onOpenChange={(open) => {
            p.onPickerOpen(open)
            // Closing the picker moves you to the first row still waiting for an after value.
            if (!open) setFocusRow(p.rows.find((r) => !r.after.trim())?.id ?? null)
          }}
          checked={new Set(p.rows.map((r) => r.prop))}
          onToggle={(prop, on) => {
            if (on) p.onAddRow(prop)
            else {
              const row = p.rows.find((r) => r.prop === prop)
              if (row) p.onRemoveRow(row.id)
            }
          }}
        />
        <div className="ml-auto">
          <Tooltip label={p.canCopy ? 'Copy image and finish' : 'Write a comment first'} shortcut="⌘↵">
            <span tabIndex={p.canCopy ? undefined : 0}>
              <Button size="sm" aria-label="Copy" disabled={!p.canCopy} onClick={p.onCopy}>
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

/** Tagged "Before" only once there's an After to compare it with. */
function BeforeSlot({ url, tagged }: { url: string; tagged: boolean }) {
  return (
    <div className={cn(SLOT, 'bg-muted p-2')}>
      <img src={url} alt="Before" className="max-h-full max-w-full object-contain" />
      {tagged && <SlotLabel>Before</SlotLabel>}
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

function CssRowEditor({
  row,
  view,
  focus,
  onFocused,
  onChange,
  onRemove,
}: {
  row: CssRow
  view: ResolvedRow
  focus: boolean
  onFocused: () => void
  onChange: (patch: Partial<CssRow>) => void
  onRemove: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (!focus) return
    inputRef.current?.focus({ preventScroll: true })
    onFocused()
  }, [focus, onFocused])
  return (
    <div className="font-mono text-xs">
      <div className="flex items-center gap-2">
        <span className="w-[108px] shrink-0 truncate font-medium" title={row.prop}>
          {row.prop}
        </span>
        <span className="min-w-0 truncate text-muted-foreground" title={row.before}>
          {view.before}
        </span>
        {/* The arrow sits centred in the space between the before value and the after box. */}
        <span className="min-w-4 flex-1 text-center text-muted-foreground">→</span>
        <input
          ref={inputRef}
          value={row.after}
          onChange={(e) => onChange({ after: e.target.value })}
          placeholder="after"
          spellCheck={false}
          aria-invalid={view.problem ? true : undefined}
          className={cn(
            'h-6 w-[96px] shrink-0 rounded border bg-background px-1.5 outline-none focus:ring-2 focus:ring-highlight/40',
            view.problem && 'border-destructive focus:ring-destructive/40',
          )}
        />
        <button type="button" aria-label={`Remove ${row.prop}`} onClick={onRemove} className="text-muted-foreground hover:text-foreground">
          <X className="size-3.5" />
        </button>
      </div>
      {view.problem && (
        <div role="alert" className="mt-0.5 pr-[22px] text-right font-sans text-[11px] text-destructive">
          {view.problem}
        </div>
      )}
      {view.hint && (
        <div className="mt-0.5 flex items-center justify-end gap-1.5 pr-[22px] text-[11px]">
          <span className={cn('truncate', view.hint.struck ? 'text-muted-foreground line-through' : 'text-highlight')}>
            {view.hint.text}
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
