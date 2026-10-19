import { useEffect, useRef, useState } from 'react'
import { getHost } from './env'
import { sizeLabel } from './describe'
import { useRect } from './useRect'

interface Props {
  onPick: (el: Element) => void
  onCancel: () => void
}

/**
 * Crosshair selection. A transparent layer over the page catches the pointer,
 * so page clicks never fire; the element under it is found by hit-testing.
 * ↑ climbs to the parent, ↓ goes back down, Esc cancels.
 */
export function Selector({ onPick, onCancel }: Props) {
  const [base, setBase] = useState<Element | null>(null)
  const [depth, setDepth] = useState(0)
  const point = useRef<{ x: number; y: number } | null>(null)

  const target = (() => {
    let el = base
    for (let i = 0; i < depth && el?.parentElement && el.parentElement !== document.documentElement; i++) {
      el = el.parentElement
    }
    return el
  })()
  const rect = useRect(target)

  const hitTest = (x: number, y: number) => {
    const host = getHost()
    const el = document.elementsFromPoint(x, y).find((e) => e !== host && !host.contains(e)) ?? null
    if (el && el !== document.documentElement && el !== base) {
      setBase(el)
      setDepth(0)
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
      else if (e.key === 'ArrowUp') setDepth((d) => d + 1)
      else if (e.key === 'ArrowDown') setDepth((d) => Math.max(0, d - 1))
      else return
      e.preventDefault()
      e.stopPropagation()
    }
    const onScroll = () => point.current && hitTest(point.current.x, point.current.y)
    window.addEventListener('keydown', onKey, true)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      window.removeEventListener('scroll', onScroll, true)
    }
  })

  return (
    <>
      <div
        className="pointer-events-auto fixed inset-0 z-10 cursor-crosshair"
        onMouseMove={(e) => {
          point.current = { x: e.clientX, y: e.clientY }
          hitTest(e.clientX, e.clientY)
        }}
        onMouseDown={(e) => e.preventDefault()}
        onClick={(e) => {
          e.preventDefault()
          if (!target) hitTest(e.clientX, e.clientY)
          if (target) onPick(target)
        }}
        onWheel={() => point.current && requestAnimationFrame(() => hitTest(point.current!.x, point.current!.y))}
      />
      {target && rect && (
        <>
          <div
            className="pointer-events-none fixed z-20 rounded-[2px] border border-highlight bg-highlight/20"
            style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
          />
          <div
            className="pointer-events-none fixed z-20 rounded bg-highlight px-1.5 py-0.5 font-mono text-[11px] leading-4 text-white shadow"
            style={{
              left: Math.max(4, Math.min(rect.left, window.innerWidth - 200)),
              top: rect.top > 24 ? rect.top - 22 : Math.min(rect.bottom + 4, window.innerHeight - 22),
            }}
          >
            {sizeLabel(target)}
            <span className="ml-2 text-white/70">↑ parent</span>
          </div>
        </>
      )}
    </>
  )
}
