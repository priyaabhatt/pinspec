import { useEffect, useState } from 'react'

/** Tracks an element's viewport rect every frame (scroll, resize, reflow). */
export function useRect(el: Element | null): DOMRect | null {
  const [rect, setRect] = useState<DOMRect | null>(null)
  useEffect(() => {
    if (!el) {
      setRect(null)
      return
    }
    let raf = 0
    let last = ''
    const tick = () => {
      const r = el.getBoundingClientRect()
      const key = `${r.x},${r.y},${r.width},${r.height}`
      if (key !== last) {
        last = key
        setRect(r)
      }
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [el])
  return rect
}
