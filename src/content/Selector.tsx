import { useEffect, useRef, useState } from 'react'
import { getHost } from './env'
import { breadcrumb, childAt, elementAt } from './hit'
import { useRect } from './useRect'

interface Props {
  onPick: (el: Element) => void
  onCancel: () => void
}

/**
 * Crosshair selection. A transparent layer over the page catches the pointer,
 * so page clicks never fire; the element under it is found by hit-testing.
 * ↑ climbs to the parent, ↓ steps back down (or into the child under the
 * pointer), Esc cancels.
 */
export function Selector({ onPick, onCancel }: Props) {
  /** The element under the pointer, before any ↑ or ↓. */
  const [base, setBase] = useState<Element | null>(null)
  const [target, setTarget] = useState<Element | null>(null)
  /** Elements left by ↑, so ↓ retraces the same path. */
  const trail = useRef<Element[]>([])
  const point = useRef<{ x: number; y: number } | null>(null)
  const rect = useRect(target)

  const hitTest = (x: number, y: number) => {
    const el = elementAt(x, y, getHost())
    if (el && el !== base) {
      setBase(el)
      setTarget(el)
      trail.current = []
    }
  }

  const up = () => {
    const parent = target?.parentElement
    if (!target || !parent || parent === document.documentElement) return
    trail.current.push(target)
    setTarget(parent)
  }

  const down = () => {
    if (!target) return
    const next = trail.current.pop() ?? childAt(target, point.current?.x ?? null, point.current?.y ?? null)
    if (next) setTarget(next)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
      else if (e.key === 'ArrowUp') up()
      else if (e.key === 'ArrowDown') down()
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

  const crumbs = target ? breadcrumb(target) : []
  const labelLeft = rect ? Math.max(4, Math.min(rect.left, window.innerWidth - 240)) : 0

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
          const picked = target ?? elementAt(e.clientX, e.clientY, getHost())
          if (picked) onPick(picked)
        }}
        onWheel={() => point.current && requestAnimationFrame(() => hitTest(point.current!.x, point.current!.y))}
      />
      {target && rect && (
        <>
          <div
            className="pointer-events-none fixed z-20 rounded-[2px] border border-highlight bg-highlight/20"
            style={{ left: rect.left, top: rect.top, width: Math.max(rect.width, 1), height: Math.max(rect.height, 1) }}
          />
          <div
            className="pointer-events-none fixed z-20 flex items-center gap-2 overflow-hidden rounded bg-highlight px-1.5 py-0.5 font-mono text-[11px] leading-4 whitespace-nowrap text-white shadow"
            style={{
              left: labelLeft,
              maxWidth: window.innerWidth - labelLeft - 8,
              top: rect.top > 24 ? rect.top - 22 : Math.min(rect.bottom + 4, window.innerHeight - 22),
            }}
          >
            <span className="min-w-0 truncate" dir="rtl">
              {/* rtl so a long path is cut at its start, keeping the selected element visible */}
              <bdi>
                {crumbs.slice(0, -1).map((c, i) => (
                  <span key={i} className="text-white/70">
                    {c} ›{' '}
                  </span>
                ))}
                <span className="font-semibold">{crumbs.at(-1)}</span>
              </bdi>
            </span>
            <span className="shrink-0 text-white/80">
              {Math.round(rect.width)} × {Math.round(rect.height)}
            </span>
            <span className="shrink-0 text-white/60">↑↓</span>
          </div>
        </>
      )}
    </>
  )
}
