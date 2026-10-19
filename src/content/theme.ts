// pinspec's light or dark theme follows the page being pinned, not the
// system: a light page gets a light toolbar and card even when the Mac is in
// dark mode. The copied image is always light.

import { getHost, parseColor } from './env'

/** Namespaced, so a page rule like [data-theme="dark"] can't reach pinspec. */
const ATTRIBUTE = 'data-pinspec-theme'

export function syncTheme() {
  getHost().setAttribute(ATTRIBUTE, pageIsDark() ? 'dark' : 'light')
}

/**
 * The page's background as seen in the middle of the screen: the first opaque
 * background from the element there up through its ancestors, so a dark
 * wrapper (#__next, a full-height div) counts. If nothing is opaque, the
 * page's color-scheme decides.
 */
function pageIsDark() {
  const host = getHost()
  const middle = document
    .elementsFromPoint(window.innerWidth / 2, window.innerHeight / 2)
    .find((e) => e !== host && !host.contains(e))
  for (let el: Element | null = middle ?? document.body; el; el = el.parentElement) {
    const rgba = parseColor(getComputedStyle(el).backgroundColor)
    if (rgba && rgba[3] > 0.5) return luminance(rgba) < 0.18
  }
  const scheme = getComputedStyle(document.documentElement).colorScheme
  return scheme.includes('dark') && !scheme.includes('light')
}

/** WCAG relative luminance (0 black, 1 white). */
function luminance([r, g, b]: [number, number, number, number]) {
  const lin = (c: number) => {
    c /= 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}
