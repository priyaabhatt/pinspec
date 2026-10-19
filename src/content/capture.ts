// Screenshots via chrome.tabs.captureVisibleTab, cropped to an element.

import { getHost } from './env'

function nextFrame() {
  return new Promise<void>((r) => requestAnimationFrame(() => r()))
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not load image'))
    img.src = src
  })
}

let lastCapture = 0

/** Capture the visible tab with pinspec's own UI hidden for that frame. */
export async function captureVisible(): Promise<HTMLImageElement> {
  // Chrome allows two captures per second per extension.
  const wait = 550 - (Date.now() - lastCapture)
  if (wait > 0) await new Promise((r) => setTimeout(r, wait))

  const host = getHost()
  host.style.setProperty('visibility', 'hidden', 'important')
  try {
    await nextFrame()
    await nextFrame()
    const res: { dataUrl?: string; error?: string } = await chrome.runtime.sendMessage({ type: 'pinspec:capture' })
    lastCapture = Date.now()
    if (!res?.dataUrl) throw new Error(res?.error ?? 'Capture failed')
    return await loadImage(res.dataUrl)
  } finally {
    host.style.removeProperty('visibility')
  }
}

/**
 * Crop to exactly the element's box, clamped to the viewport; neighbouring
 * content would read as part of the element. Used when it fits on screen.
 */
export function cropToElement(shot: HTMLImageElement, rect: DOMRect): HTMLCanvasElement {
  const scale = shot.naturalWidth / window.innerWidth
  const x0 = Math.max(0, rect.left)
  const y0 = Math.max(0, rect.top)
  const x1 = Math.min(window.innerWidth, rect.right)
  const y1 = Math.min(window.innerHeight, rect.bottom)
  const w = Math.max(1, Math.round((x1 - x0) * scale))
  const h = Math.max(1, Math.round((y1 - y0) * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d')!.drawImage(shot, Math.round(x0 * scale), Math.round(y0 * scale), w, h, 0, 0, w, h)
  return canvas
}

/** Tallest element we stitch, in CSS px. Beyond this the image is cut off. */
const MAX_STITCH_HEIGHT = 8000

function isScrollable(el: Element) {
  const oy = getComputedStyle(el).overflowY
  return (oy === 'auto' || oy === 'scroll' || oy === 'overlay') && el.scrollHeight > el.clientHeight + 1
}

/** The element that scrolls `el` vertically: an overflow container, or the page. */
function scrollerFor(el: Element): Element {
  for (let p = el.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
    if (isScrollable(p)) return p
  }
  return document.scrollingElement ?? document.documentElement
}

/** The part of the viewport the scroller shows its content in. */
function bandFor(scroller: Element) {
  if (scroller === document.scrollingElement || scroller === document.documentElement) {
    return { top: 0, bottom: window.innerHeight }
  }
  const r = scroller.getBoundingClientRect()
  return { top: Math.max(0, r.top + scroller.clientTop), bottom: Math.min(window.innerHeight, r.top + scroller.clientTop + scroller.clientHeight) }
}

/**
 * Sticky and fixed elements (headers, toolbars) would cover the element or
 * repeat in every slice. Hide those that aren't part of the element, and
 * return a function that puts them back.
 */
function hideFloating(target: Element): () => void {
  const hidden: { el: HTMLElement; value: string; priority: string }[] = []
  for (const el of Array.from(document.body.querySelectorAll<HTMLElement>('*'))) {
    if (el.contains(target) || target.contains(el)) continue
    const pos = getComputedStyle(el).position
    if (pos !== 'fixed' && pos !== 'sticky') continue
    hidden.push({ el, value: el.style.getPropertyValue('visibility'), priority: el.style.getPropertyPriority('visibility') })
    el.style.setProperty('visibility', 'hidden', 'important')
  }
  return () => {
    for (const h of hidden) {
      if (h.value) h.el.style.setProperty('visibility', h.value, h.priority)
      else h.el.style.removeProperty('visibility')
      if (!h.el.getAttribute('style')) h.el.removeAttribute('style')
    }
  }
}

/** Rounded corners of a scroll container would show as seams between slices. */
function cornerInset(scroller: Element, bandH: number) {
  if (scroller === document.scrollingElement || scroller === document.documentElement) return 0
  const cs = getComputedStyle(scroller)
  const r = Math.max(...[cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomLeftRadius, cs.borderBottomRightRadius].map((v) => parseFloat(v) || 0))
  return Math.min(Math.ceil(r), Math.floor(bandH / 4))
}

/**
 * For elements taller than the visible area: scroll through them, capture
 * each screenful, and stitch the slices into one image. The scroll position
 * is restored afterwards.
 */
async function captureTall(el: Element): Promise<HTMLCanvasElement> {
  const scroller = scrollerFor(el)
  const startTop = scroller.scrollTop
  const band = bandFor(scroller)
  const inset = cornerInset(scroller, band.bottom - band.top)
  const scrollBy = (dy: number) => scroller.scrollTo({ top: scroller.scrollTop + dy, behavior: 'instant' })
  const atEnd = () => scroller.scrollTop >= scroller.scrollHeight - scroller.clientHeight - 1

  // The captured region: exactly the element, in its scroll content.
  const first = el.getBoundingClientRect()
  const totalH = Math.min(first.height, MAX_STITCH_HEIGHT)
  const x0 = Math.max(0, first.left)
  const x1 = Math.min(window.innerWidth, first.right)
  /** Viewport y of the region's first row, measured after each scroll. */
  const regionTop = () => el.getBoundingClientRect().top

  let out: HTMLCanvasElement | null = null
  let ctx: CanvasRenderingContext2D | null = null
  const restore = hideFloating(el)
  try {
    for (let done = 0; done < totalH; ) {
      // Bring row `done` to the top of the visible band (below the corner inset after the first slice).
      const visTop = band.top + (done === 0 ? 0 : inset)
      scrollBy(regionTop() + done - visTop)
      const shot = await captureVisible()
      // Scrolling can stop short at the ends of the content; measure where we landed.
      const top = regionTop()
      const visBottom = atEnd() ? band.bottom : band.bottom - inset
      const from = Math.max(done, visTop - top)
      const to = Math.min(totalH, visBottom - top)
      if (to <= from) break
      const scale = shot.naturalWidth / window.innerWidth
      if (!out) {
        out = document.createElement('canvas')
        out.width = Math.max(1, Math.round((x1 - x0) * scale))
        out.height = Math.max(1, Math.round(totalH * scale))
        ctx = out.getContext('2d')!
      }
      const h = Math.round((to - from) * scale)
      ctx!.drawImage(shot, Math.round(x0 * scale), Math.round((top + from) * scale), out.width, h, 0, Math.round(from * scale), out.width, h)
      done = to
    }
  } finally {
    restore()
    scroller.scrollTo({ top: startTop, behavior: 'instant' })
  }
  if (!out) throw new Error('Nothing to capture')
  return out
}

export async function captureElement(el: Element): Promise<HTMLCanvasElement> {
  const r = el.getBoundingClientRect()
  const band = bandFor(scrollerFor(el))
  if (r.height > band.bottom - band.top) return captureTall(el)
  if (r.top < band.top || r.bottom > band.bottom || r.right < 0 || r.left > window.innerWidth) {
    el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' })
  }
  const shot = await captureVisible()
  return cropToElement(shot, el.getBoundingClientRect())
}
