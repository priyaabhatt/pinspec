import type { Area } from '@/lib/pin'

/** A dragged area's viewport rect, from the rect of the element it sits on. */
export function areaRect(el: DOMRect, area: Area): DOMRect {
  return new DOMRect(el.left + area.left, el.top + area.top, area.width, area.height)
}
