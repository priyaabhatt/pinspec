// The shadow root pinspec lives in, plus helpers that need a live DOM node
// inside it (measuring lengths, resolving colours, reading default styles).

let shadow: ShadowRoot | null = null
let host: HTMLElement | null = null
let probe: HTMLDivElement | null = null
let colorCtx: CanvasRenderingContext2D | null = null

export function setEnv(h: HTMLElement, s: ShadowRoot) {
  host = h
  shadow = s
  probe = document.createElement('div')
  probe.setAttribute('aria-hidden', 'true')
  probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;left:-9999px;top:0;'
  s.appendChild(probe)
}

export function getHost() {
  if (!host) throw new Error('pinspec env not set')
  return host
}

export function getShadow() {
  if (!shadow) throw new Error('pinspec env not set')
  return shadow
}

/** Root font size of the page, for rem tokens. */
export function remPx() {
  return parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
}

/** Resolve any CSS length (calc, rem, var-substituted) to px using the page's rem. */
export function resolveLength(value: string): number | null {
  if (!probe || !CSS.supports('width', value)) return null
  probe.style.width = ''
  probe.style.width = value
  const px = parseFloat(getComputedStyle(probe).width)
  return Number.isFinite(px) ? px : null
}

const colorCache = new Map<string, [number, number, number, number] | null>()

/**
 * Any CSS colour (hex, rgb, hsl, oklch, named, shadcn's bare "220 9% 46%")
 * to sRGB by painting a pixel, which handles every syntax Chrome knows.
 */
export function parseColor(value: string): [number, number, number, number] | null {
  let v = value.trim()
  if (colorCache.has(v)) return colorCache.get(v)!
  if (!CSS.supports('color', v)) {
    if (/^-?[\d.]+(deg)?\s+[\d.]+%\s+[\d.]+%/.test(v) && CSS.supports('color', `hsl(${v})`)) v = `hsl(${v})`
    else {
      colorCache.set(value.trim(), null)
      return null
    }
  }
  if (!colorCtx) {
    const c = document.createElement('canvas')
    c.width = c.height = 1
    colorCtx = c.getContext('2d', { willReadFrequently: true })
  }
  const ctx = colorCtx!
  ctx.clearRect(0, 0, 1, 1)
  ctx.fillStyle = '#000'
  ctx.fillStyle = v
  ctx.fillRect(0, 0, 1, 1)
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data
  // Premultiplied readback loses precision at low alpha; good enough for matching.
  const rgba: [number, number, number, number] = [r, g, b, +(a / 255).toFixed(3)]
  colorCache.set(value.trim(), rgba)
  return rgba
}

let defaultsFrame: HTMLIFrameElement | null = null
const defaults = new Map<string, CSSStyleDeclaration>()

/** Computed styles of a bare element of the same tag, to spot non-default values. */
export function defaultStyleFor(tag: string): CSSStyleDeclaration | null {
  if (!shadow) return null
  if (!defaultsFrame) {
    defaultsFrame = document.createElement('iframe')
    defaultsFrame.setAttribute('aria-hidden', 'true')
    defaultsFrame.tabIndex = -1
    defaultsFrame.style.cssText = 'position:absolute;width:0;height:0;border:0;visibility:hidden;left:-9999px;'
    shadow.appendChild(defaultsFrame)
  }
  const doc = defaultsFrame.contentDocument
  if (!doc?.body) return null
  if (!defaults.has(tag)) {
    const el = doc.createElement(tag)
    doc.body.appendChild(el)
    defaults.set(tag, defaultsFrame.contentWindow!.getComputedStyle(el))
  }
  return defaults.get(tag)!
}

/**
 * Match pinspec's theme to the page being pinned, not the system: a dark page
 * gets a dark toolbar and card. Reads the page's background (body, then html);
 * if both are transparent, the page's color-scheme decides.
 */
export function syncTheme() {
  if (!host) return
  host.setAttribute('data-theme', pageIsDark() ? 'dark' : 'light')
}

function pageIsDark() {
  for (const el of [document.body, document.documentElement]) {
    if (!el) continue
    const rgba = parseColor(getComputedStyle(el).backgroundColor)
    if (rgba && rgba[3] > 0.5) {
      const [r, g, b] = rgba.map((c) => c / 255)
      return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.4
    }
  }
  const scheme = getComputedStyle(document.documentElement).colorScheme
  return scheme.includes('dark') && !scheme.includes('light')
}
