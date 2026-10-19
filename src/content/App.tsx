import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { colorClass, hasSystem, hex, isColorProp, snapValue } from '@/lib/snap'
import { captureElement, loadImage } from './capture'
import { Card } from './Card'
import { compose, toPng, type ComposeRow } from './compose'
import { caption } from './describe'
import { parseColor, remPx } from './env'
import { footer, tidy } from './footer'
import { LiveEdits } from './liveEdits'
import { Selector } from './Selector'
import { describeValue, readValue } from './styles'
import { readDesignSystem } from './tokens'
import { Toolbar } from './Toolbar'
import type { AfterImage, Row } from './types'
import { useRect } from './useRect'

type Mode = 'idle' | 'selecting' | 'capturing' | 'card'

export function App({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<Mode>('idle')
  const [el, setEl] = useState<Element | null>(null)
  const [before, setBefore] = useState<HTMLCanvasElement | null>(null)
  const [comment, setComment] = useState('')
  const [after, setAfter] = useState<AfterImage | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<{ text: string; tone: 'ok' | 'error' } | null>(null)
  const nextId = useRef(1)
  const edits = useRef(new LiveEdits())
  const rect = useRect(mode === 'card' ? el : null)
  const ds = useMemo(() => readDesignSystem(), [el])

  const flash = useCallback((text: string, tone: 'ok' | 'error' = 'ok') => {
    setToast({ text, tone })
    window.setTimeout(() => setToast((t) => (t?.text === text ? null : t)), tone === 'ok' ? 1600 : 4000)
  }, [])

  // Live preview: typed after values are applied to the page as you type.
  const applied = useMemo(() => {
    const m = new Map<string, string>()
    for (const r of rows) {
      const v = r.after.trim()
      if (!v) continue
      const snap = r.exact ? null : snapValue(r.prop, v, ds, parseColor, remPx())
      const value = snap ? snap.value : v
      if (CSS.supports(r.prop, value)) m.set(r.prop, value)
    }
    return m
  }, [rows, ds])

  useEffect(() => {
    edits.current.sync(mode === 'card' || mode === 'capturing' ? el : null, applied)
  }, [el, mode, applied])

  const clearElement = () => {
    edits.current.restoreAll()
    setEl(null)
    setBefore(null)
  }

  /** Copy, Esc or ✕ end the pin. Nothing survives. */
  const discard = useCallback(() => {
    edits.current.restoreAll()
    if (after) URL.revokeObjectURL(after.url)
    setEl(null)
    setBefore(null)
    setComment('')
    setAfter(null)
    setRows([])
    setPickerOpen(false)
    setMode('idle')
  }, [after])

  const startSelecting = () => {
    if (mode === 'selecting') {
      setMode(el ? 'card' : 'idle')
      return
    }
    clearElement()
    setPickerOpen(false)
    setMode('selecting')
  }

  const pick = async (target: Element) => {
    setMode('capturing')
    try {
      const shot = await captureElement(target)
      setEl(target)
      setBefore(shot)
      setRows((rs) => rs.map((r) => ({ ...r, before: readValue(target, r.prop) })))
      setMode('card')
    } catch (err) {
      flash(`Couldn't capture: ${(err as Error).message}`, 'error')
      setMode('selecting')
    }
  }

  // Esc discards the pin (or closes the property picker first).
  useEffect(() => {
    if (mode !== 'card') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || pickerOpen) return
      e.preventDefault()
      e.stopPropagation()
      discard()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [mode, pickerOpen, discard])

  const setAfterFile = async (file: File) => {
    const url = URL.createObjectURL(file)
    try {
      const img = await loadImage(url)
      if (after) URL.revokeObjectURL(after.url)
      setAfter({ url, img })
    } catch {
      URL.revokeObjectURL(url)
      flash("That image couldn't be read", 'error')
    }
  }

  const composeRows = (): ComposeRow[] =>
    rows
      .filter((r) => r.after.trim())
      .map((r) => {
        const v = r.after.trim()
        const b = describeValue(r.prop, r.before, ds)
        const color = isColorProp(r.prop)
        const snap = r.exact ? null : snapValue(r.prop, v, ds, parseColor, remPx())
        const afterRgba = color ? parseColor(snap?.value ?? v) : null
        const beforeRgba = color ? parseColor(r.before) : null
        let afterText = v
        let afterNote: string | undefined
        if (r.exact) afterNote = 'exact'
        else if (snap) {
          afterText = snap.token
          // Tokens over hex: colour tokens never carry their value.
          if (!color) afterNote = snap.value
        }
        return {
          prop: r.prop,
          before: b.token ? colorClass(r.prop, b.token) : b.text,
          after: afterText,
          afterNote,
          beforeSwatch: beforeRgba ? hex(beforeRgba) : undefined,
          afterSwatch: afterRgba ? hex(afterRgba) : undefined,
        }
      })

  const copy = () => {
    if (!el || !before || !comment.trim() || busy) return
    setBusy(true)
    const cRows = composeRows()
    const png = (async () => {
      let afterImg: ComposeRowSource | null = after?.img ?? null
      // No pasted after: the live render of the CSS edits becomes the After.
      if (!afterImg && cRows.length) afterImg = await captureElement(el)
      const canvas = compose({
        before,
        after: afterImg,
        caption: caption(el),
        afterCaption: after ? 'Pasted target' : cRows.length ? 'Live render of the CSS below' : '',
        rows: cRows,
        comment: tidy(comment),
        footer: footer({
          hasSystem: hasSystem(ds),
          hasRows: cRows.length > 0,
          hasExact: rows.some((r) => r.exact && r.after.trim()),
        }),
      })
      return toPng(canvas)
    })()
    // Handing the clipboard a promise keeps the click's user activation alive
    // across the async capture.
    navigator.clipboard
      .write([new ClipboardItem({ 'image/png': png })])
      .then(() => {
        discard()
        flash('Copied. Paste it into your agent')
      })
      .catch((err) => flash(`Couldn't copy: ${err?.message ?? err}`, 'error'))
      .finally(() => setBusy(false))
  }

  return (
    <TooltipProvider delayDuration={400}>
      {mode === 'selecting' && <Selector onPick={pick} onCancel={discard} />}
      {mode === 'card' && el && rect && (
        <>
          <div
            className="pointer-events-none fixed z-20 rounded-[2px] outline-2 outline-highlight"
            style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
          />
          <Card
            el={el}
            rect={rect}
            ds={ds}
            comment={comment}
            onComment={setComment}
            after={after}
            onAfterFile={setAfterFile}
            onClearAfter={() => {
              if (after) URL.revokeObjectURL(after.url)
              setAfter(null)
            }}
            rows={rows}
            onAddRow={(prop) => {
              const id = nextId.current++
              setRows((rs) => [...rs, { id, prop, before: readValue(el, prop), after: '', exact: false }])
              return id
            }}
            onRow={(id, patch) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)))}
            onRemoveRow={(id) => setRows((rs) => rs.filter((r) => r.id !== id))}
            pickerOpen={pickerOpen}
            onPickerOpen={setPickerOpen}
            busy={busy}
            onRemove={startSelecting}
            onCopy={copy}
          />
        </>
      )}
      <Toolbar
        selecting={mode === 'selecting'}
        toast={toast}
        onSelect={startSelecting}
        onClose={() => {
          discard()
          onClose()
        }}
      />
    </TooltipProvider>
  )
}

type ComposeRowSource = HTMLImageElement | HTMLCanvasElement
