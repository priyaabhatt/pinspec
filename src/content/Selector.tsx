import { useEffect, useRef, useState } from 'react'
import type { Area } from '@/lib/pin'
import { getHost } from './env'
import { breadcrumb, childAt, elementAt } from './hit'
import { useRect } from './useRect'

interface Props {
  /** An element, or with `area` a box dragged on the element under it. */
  onPick: (el: Element, area: Area | null) => void
  onCancel: () => void
}

/** How far the pointer moves with the button down before a click becomes a drag. */
const DRAG_START = 6

interface Box {
  x0: number
  y0: number
  x1: number
  y1: number
}

const boxRect = (b: Box) =>
  new DOMRect(Math.min(b.x0, b.x1), Math.min(b.y0, b.y1), Math.abs(b.x1 - b.x0), Math.abs(b.y1 - b.y0))

/**
 * Crosshair selection. A transparent layer over the page catches the pointer,
 * so page clicks never fire; the element under it is found by hit-testing.
 * ↑ climbs to the parent, ↓ steps back down (or into the child under the
 * pointer), Esc cancels. Dragging draws a box instead, for parts of a page
 * that aren't elements of their own, such as frames drawn on a canvas.
 */
export function Selector({ onPick, onCancel }: Props) {
  /** The element under the pointer, before any ↑ or ↓. */
  const [base, setBase] = useState<Element | null>(null)
  const [target, setTarget] = useState<Element | null>(null)
  /** Elements left by ↑, so ↓ retraces the same path. */
  const trail = useRef<Element[]>([])
  const point = useRef<{ x: number; y: number } | null>(null)
  /** Where the button went down, until it comes up. */
  const press = useRef<{ x: number; y: number } | null>(null)
  const [box, setBox] = useState<Box | null>(null)
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
      if (e.key === 'Escape') {
        if (press.current) {
          press.current = null
          setBox(null)
        } else onCancel()
      }
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
          const start = press.current
          if (start && (box || Math.hypot(e.clientX - start.x, e.clientY - start.y) > DRAG_START)) {
            setBox({ x0: start.x, y0: start.y, x1: e.clientX, y1: e.clientY })
          } else if (!box) hitTest(e.clientX, e.clientY)
        }}
        onMouseDown={(e) => {
          e.preventDefault()
          if (e.button === 0) press.current = { x: e.clientX, y: e.clientY }
        }}
        onMouseUp={(e) => {
          if (!press.current) return
          press.current = null
          if (box) {
            e.preventDefault()
            setBox(null)
            const r = boxRect(box)
            const under = elementAt(r.left + r.width / 2, r.top + r.height / 2, getHost())
            if (!under) return
            const el = under.getBoundingClientRect()
            onPick(under, { left: r.left - el.left, top: r.top - el.top, width: r.width, height: r.height })
          } else {
            const picked = target ?? elementAt(e.clientX, e.clientY, getHost())
            if (picked) onPick(picked, null)
          }
        }}
        onWheel={() => point.current && requestAnimationFrame(() => hitTest(point.current!.x, point.current!.y))}
      />
      {box && <BoxOutline rect={boxRect(box)} />}
      {!box && target && rect && (
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

function BoxOutline({ rect }: { rect: DOMRect }) {
  return (
    <>
      <div
        className="pointer-events-none fixed z-20 rounded-[2px] border border-highlight bg-highlight/20"
        style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
      />
      <div
        className="pointer-events-none fixed z-20 rounded bg-highlight px-1.5 py-0.5 font-mono text-[11px] leading-4 text-white shadow"
        style={{ left: rect.left, top: rect.top > 24 ? rect.top - 22 : rect.bottom + 4 }}
      >
        {Math.round(rect.width)} × {Math.round(rect.height)}
      </div>
    </>
  )
}
