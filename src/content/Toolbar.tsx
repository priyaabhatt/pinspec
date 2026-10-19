import { useRef, useState } from 'react'
import { MousePointer2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

/** Matches the manifest's _execute_action command; users can rebind it in chrome://extensions/shortcuts. */
const SHORTCUT = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌥⇧P' : 'Alt+Shift+P'

interface Props {
  selecting: boolean
  toast: { text: string; tone: 'ok' | 'error' } | null
  onSelect: () => void
  onClose: () => void
}

/** Floating toolbar: two icons, never expands. Drag it by its edge. */
export function Toolbar({ selecting, toast, onSelect, onClose }: Props) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as Element).closest('button') || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    const dx = e.clientX - r.left
    const dy = e.clientY - r.top
    const move = (ev: PointerEvent) => {
      setPos({
        x: Math.min(Math.max(0, ev.clientX - dx), window.innerWidth - r.width),
        y: Math.min(Math.max(0, ev.clientY - dy), window.innerHeight - r.height),
      })
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    e.preventDefault()
  }

  return (
    <div
      ref={ref}
      onPointerDown={onPointerDown}
      className="pointer-events-auto fixed z-30 flex cursor-grab items-center gap-1 rounded-xl border bg-background p-1.5 shadow-lg active:cursor-grabbing"
      style={pos ? { left: pos.x, top: pos.y } : { left: '50%', bottom: 24, transform: 'translateX(-50%)' }}
    >
      <Tooltip label={selecting ? 'Selecting… click an element' : 'Select an element'} shortcut={selecting ? 'Esc to cancel' : undefined}>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Select an element"
          aria-pressed={selecting}
          onClick={onSelect}
          className={cn(selecting && 'bg-highlight text-white hover:bg-highlight hover:text-white')}
        >
          <MousePointer2 />
        </Button>
      </Tooltip>
      <Tooltip label="Turn off pinspec" shortcut={SHORTCUT}>
        <Button variant="ghost" size="icon" aria-label="Turn off pinspec" onClick={onClose}>
          <X />
        </Button>
      </Tooltip>
      {toast && (
        <div
          role="status"
          className={cn(
            'pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium shadow-md',
            toast.tone === 'ok' ? 'bg-primary text-primary-foreground' : 'bg-destructive text-white',
          )}
        >
          {toast.text}
        </div>
      )}
    </div>
  )
}
