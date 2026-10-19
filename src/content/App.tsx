import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Pin } from '@/lib/pin'
import { loadImage } from './capture'
import { Card } from './Card'
import { pageEnvironment } from './pinEnvironment'
import { Selector } from './Selector'
import { Toolbar } from './Toolbar'
import { useRect } from './useRect'

export function App({ onClose }: { onClose: () => void }) {
  // The pin owns its contents and lifecycle; App renders it and holds UI-only
  // state (the picker, the toast). Activating pinspec starts selecting.
  const [pin] = useState(() => new Pin(pageEnvironment(), 'selecting'))
  const { stage, element: el, before, comment, after, rows, resolved, designSystem, busy } = useSyncExternalStore(pin.subscribe, pin.get)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [toast, setToast] = useState<{ text: string; tone: 'ok' | 'error' } | null>(null)
  const rect = useRect(stage === 'card' ? el : null)
  const beforeUrl = useMemo(() => (before instanceof HTMLCanvasElement ? before.toDataURL('image/png') : ''), [before])

  const flash = useCallback((text: string, tone: 'ok' | 'error' = 'ok') => {
    setToast({ text, tone })
    window.setTimeout(() => setToast((t) => (t?.text === text ? null : t)), tone === 'ok' ? 1600 : 4000)
  }, [])

  const discard = useCallback(() => {
    setPickerOpen(false)
    pin.discard()
  }, [pin])

  // Esc discards the pin while the card is open (or closes the picker first).
  useEffect(() => {
    if (stage !== 'card') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || pickerOpen) return
      e.preventDefault()
      e.stopPropagation()
      discard()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [stage, pickerOpen, discard])

  const pick = async (target: Element) => {
    const outcome = await pin.pick(target)
    if (!outcome.ok) flash(outcome.error, 'error')
  }

  const toggleSelecting = () => {
    setPickerOpen(false)
    pin.toggleSelecting()
  }

  const setAfterFile = async (file: File) => {
    const url = URL.createObjectURL(file)
    try {
      const img = await loadImage(url)
      // Discarded while the image loaded: there's no pin to attach it to.
      if (pin.get().stage !== 'card') return URL.revokeObjectURL(url)
      pin.setAfter({ url, img })
    } catch {
      URL.revokeObjectURL(url)
      flash("That image couldn't be read", 'error')
    }
  }

  const copy = async () => {
    const outcome = await pin.copy()
    if (outcome.ok) {
      setPickerOpen(false)
      flash('Copied. Paste it into your agent')
    } else flash(outcome.error, 'error')
  }

  return (
    <TooltipProvider delayDuration={400}>
      {stage === 'selecting' && <Selector onPick={pick} onCancel={() => pin.cancelSelecting()} />}
      {stage === 'card' && el && rect && designSystem && (
        <>
          <div
            className="pointer-events-none fixed z-20 rounded-[2px] outline-2 outline-highlight"
            style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
          />
          <Card
            el={el}
            beforeUrl={beforeUrl}
            rect={rect}
            ds={designSystem}
            comment={comment}
            onComment={(c) => pin.setComment(c)}
            after={after}
            onAfterFile={setAfterFile}
            onClearAfter={() => pin.setAfter(null)}
            rows={rows}
            resolved={resolved}
            onAddRow={(prop) => pin.addRow(prop)}
            onRow={(id, patch) => pin.updateRow(id, patch)}
            onRemoveRow={(id) => pin.removeRow(id)}
            pickerOpen={pickerOpen}
            onPickerOpen={setPickerOpen}
            busy={busy}
            onRemove={toggleSelecting}
            onCancel={discard}
            onCopy={copy}
          />
        </>
      )}
      <Toolbar
        selecting={stage === 'selecting'}
        toast={toast}
        onSelect={toggleSelecting}
        onClose={() => {
          discard()
          onClose()
        }}
      />
    </TooltipProvider>
  )
}
