// Hit-testing helpers for selection: which element is under the pointer,
// stepping into children, and a short breadcrumb for the hover label.

/** Elements that render something even when empty. */
const REPLACED = new Set(['IMG', 'SVG', 'VIDEO', 'CANVAS', 'INPUT', 'TEXTAREA', 'SELECT', 'IFRAME', 'PICTURE', 'OBJECT', 'EMBED', 'HR'])

/**
 * Invisible layers: fully transparent elements, and empty leaf elements with
 * no background, border or shadow (click-catchers and overlay wrappers).
 * The pointer should reach whatever they cover.
 */
export function isInvisible(el: Element) {
  const cs = getComputedStyle(el)
  if (cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) return true
  if (el.children.length || REPLACED.has(el.tagName.toUpperCase()) || el.textContent?.trim()) return false
  const transparentBg = cs.backgroundImage === 'none' && /rgba\(.*,\s*0\)$|transparent/.test(cs.backgroundColor)
  const noBorder = ['Top', 'Right', 'Bottom', 'Left'].every((s) => parseFloat(cs.getPropertyValue(`border-${s.toLowerCase()}-width`)) === 0)
  return transparentBg && noBorder && cs.boxShadow === 'none' && cs.outlineStyle === 'none'
}

/** Icons are one thing: a hit on a path inside an <svg> selects the svg. */
export function normalize(el: Element): Element {
  if (el instanceof SVGElement && !(el instanceof SVGSVGElement)) return el.closest('svg') ?? el
  return el
}

/** The element under the point, ignoring pinspec's own UI and invisible layers. */
export function elementAt(x: number, y: number, host: Element): Element | null {
  const hits = document.elementsFromPoint(x, y).filter((e) => e !== host && !host.contains(e) && e !== document.documentElement)
  const visible = hits.find((e) => !isInvisible(e)) ?? hits[0]
  return visible ? normalize(visible) : null
}

function hasBox(el: Element) {
  const r = el.getBoundingClientRect()
  return r.width > 0 && r.height > 0
}

/** For ↓: the child under the point, or else the first visible child. Never into an svg. */
export function childAt(el: Element, x: number | null, y: number | null): Element | null {
  if (el instanceof SVGSVGElement) return null
  const kids = Array.from(el.children).filter((c) => hasBox(c) && !isInvisible(c))
  if (x !== null && y !== null) {
    const under = kids.find((c) => {
      const r = c.getBoundingClientRect()
      return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom
    })
    if (under) return normalize(under)
  }
  return kids[0] ? normalize(kids[0]) : null
}

function segment(el: Element) {
  const tag = el.tagName.toLowerCase()
  if (el.id) return `${tag}#${el.id.length > 18 ? el.id.slice(0, 17) + '…' : el.id}`
  const cls = Array.from(el.classList).find((c) => !c.startsWith('pinspec'))
  return cls ? `${tag}.${cls.length > 18 ? cls.slice(0, 17) + '…' : cls}` : tag
}

/** e.g. ["div.card", "div.row", "button.btn"], ending with the element itself. */
export function breadcrumb(el: Element, max = 4): string[] {
  const out: string[] = []
  for (let e: Element | null = el; e && e !== document.body && e !== document.documentElement && out.length < max; e = e.parentElement) {
    out.unshift(segment(e))
  }
  return out
}
