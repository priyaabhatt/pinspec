// Pure snapping logic: given a typed value and the page's design system,
// find the nearest step or token. No DOM access here so it can be unit tested.

export type Rgba = [number, number, number, number]

export interface ColorToken {
  /** Custom property name, e.g. --color-muted-foreground */
  name: string
  rgba: Rgba
}

export interface LengthToken {
  /** Custom property name, e.g. --radius-lg */
  name: string
  px: number
}

export interface DesignSystem {
  /** Tailwind v4 --spacing base, in px (usually 4). */
  spacing: number | null
  /** A named spacing scale (--space-4, --gap-md) on sites without Tailwind's --spacing. */
  spaces: LengthToken[]
  colors: ColorToken[]
  radii: LengthToken[]
  fontSizes: LengthToken[]
  fontWeights: LengthToken[]
}

export interface Snap {
  /** What the agent should implement, e.g. "w-88" or "var(--space-4)". */
  token: string
  /** The concrete value the token resolves to, e.g. "352px". */
  value: string
  exact: boolean
}

export const SPACING_PREFIX: Record<string, string> = {
  width: 'w',
  height: 'h',
  'min-width': 'min-w',
  'min-height': 'min-h',
  'max-width': 'max-w',
  'max-height': 'max-h',
  padding: 'p',
  'padding-top': 'pt',
  'padding-right': 'pr',
  'padding-bottom': 'pb',
  'padding-left': 'pl',
  margin: 'm',
  'margin-top': 'mt',
  'margin-right': 'mr',
  'margin-bottom': 'mb',
  'margin-left': 'ml',
  gap: 'gap',
  'row-gap': 'gap-y',
  'column-gap': 'gap-x',
  top: 'top',
  right: 'right',
  bottom: 'bottom',
  left: 'left',
}

export const COLOR_PREFIX: Record<string, string> = {
  color: 'text',
  'background-color': 'bg',
  'border-color': 'border',
  'border-top-color': 'border-t',
  'border-right-color': 'border-r',
  'border-bottom-color': 'border-b',
  'border-left-color': 'border-l',
  'outline-color': 'outline',
  fill: 'fill',
  stroke: 'stroke',
}

const RADIUS_PROPS = new Set([
  'border-radius',
  'border-top-left-radius',
  'border-top-right-radius',
  'border-bottom-left-radius',
  'border-bottom-right-radius',
])

export function isColorProp(prop: string) {
  return prop in COLOR_PREFIX
}

export function hasSystem(ds: DesignSystem) {
  return ds.spacing !== null || [ds.spaces, ds.colors, ds.radii, ds.fontSizes, ds.fontWeights].some((t) => t.length > 0)
}

export type TokenKind = 'spacing-base' | 'space' | 'radius' | 'font-size' | 'font-weight' | 'color'

/**
 * What a custom property is, from its name. Covers Tailwind v4 and shadcn
 * (--spacing, --radius-lg, --text-sm, --font-weight-bold, --color-*) and the
 * common hand-rolled conventions (--space-4, --gap-md, --rounded-sm,
 * --font-size-lg, --fw-bold). Anything else may be a colour; the caller
 * checks the value. Returns null for families that are never snapped to.
 */
export function tokenKind(name: string): TokenKind | null {
  // Tailwind internals, and sub-properties like --text-sm--line-height.
  if (name.startsWith('--tw-') || name.includes('--', 2)) return null
  if (name === '--spacing') return 'spacing-base'
  if (/^--(spacing|space|spacer|gap|gutter)[-_]./.test(name)) return 'space'
  if (/^--(radius|radii|rounded|border-radius|corner)([-_].|$)/.test(name)) return 'radius'
  if (/^--text-[^-]/.test(name)) return 'font-size'
  if (/^--(font-size|fs|type-size|type-scale)[-_]./.test(name)) return 'font-size'
  if (/^--(font-weight|fw|weight)[-_]./.test(name)) return 'font-weight'
  if (/^--(breakpoint|container|font|leading|line-height|tracking|letter-spacing|shadow|blur|ease|duration|animate|default|inset|perspective|aspect|z|opacity)([-_]|$)/.test(name)) return null
  return 'color'
}

/** Tailwind theme names map to utility classes; anything else is used as var(). */
function isTailwindName(name: string) {
  return /^--(radius|text|font-weight|color)-/.test(name)
}

export function parsePx(value: string, remPx = 16): number | null {
  const m = value.trim().match(/^(-?\d*\.?\d+)(px|rem|em)?$/)
  if (!m) return null
  const n = parseFloat(m[1])
  return m[2] === 'rem' || m[2] === 'em' ? n * remPx : n
}

function fmtPx(n: number) {
  return `${+n.toFixed(2)}px`
}

export function snapSpacing(prop: string, px: number, spacing: number): Snap {
  const step = Math.round(px / spacing)
  const snapped = step * spacing
  const prefix = SPACING_PREFIX[prop]
  const neg = step < 0 ? '-' : ''
  return {
    token: `${neg}${prefix}-${Math.abs(step)}`,
    value: fmtPx(snapped),
    exact: Math.abs(snapped - px) < 0.01,
  }
}

/**
 * rounded-lg from --radius-lg, text-sm from --text-sm, font-bold from
 * --font-weight-bold; var(--space-4) for anything that isn't a Tailwind name.
 */
function lengthClass(prop: string, name: string) {
  if (!isTailwindName(name)) return `var(${name})`
  if (RADIUS_PROPS.has(prop)) return `rounded-${name.replace(/^--radius-/, '')}`
  if (prop === 'font-size') return `text-${name.replace(/^--text-/, '')}`
  if (prop === 'font-weight') return `font-${name.replace(/^--font-weight-/, '')}`
  return name
}

export function snapLength(prop: string, px: number, tokens: LengthToken[], unit = 'px'): Snap | null {
  if (!tokens.length) return null
  let best = tokens[0]
  for (const t of tokens) {
    const d = Math.abs(t.px - px) - Math.abs(best.px - px)
    // On a tie, a Tailwind name (rounded-lg) beats an alias (var(--radius)).
    if (d < 0 || (d === 0 && isTailwindName(t.name) && !isTailwindName(best.name))) best = t
  }
  return {
    token: lengthClass(prop, best.name),
    value: unit === 'px' ? fmtPx(best.px) : String(best.px),
    exact: Math.abs(best.px - px) < 0.01,
  }
}

// --- colour -------------------------------------------------------------

function toLinear(c: number) {
  c /= 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

/** sRGB -> OKLab, for perceptual nearest-colour matching. */
export function oklab([r, g, b]: Rgba): [number, number, number] {
  const lr = toLinear(r), lg = toLinear(g), lb = toLinear(b)
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb)
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb)
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ]
}

export function colorDistance(a: Rgba, b: Rgba) {
  const [l1, a1, b1] = oklab(a)
  const [l2, a2, b2] = oklab(b)
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2) + Math.abs(a[3] - b[3])
}

/**
 * Semantic tokens (--color-foreground, --muted-foreground) beat palette steps
 * (--color-gray-500) when both match, since they say what the colour is for.
 */
function tokenRank(name: string) {
  const palette = /-\d+$/.test(name)
  const tw = name.startsWith('--color-')
  if (tw && !palette) return 0
  if (!tw && !palette) return 1
  return 2
}

export function colorClass(prop: string, name: string) {
  if (name.startsWith('--color-')) return `${COLOR_PREFIX[prop] ?? 'text'}-${name.slice(8)}`
  return `var(${name})`
}

export function hex([r, g, b, a]: Rgba) {
  const h = [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase()
  return a < 1 ? `#${h}${Math.round(a * 255).toString(16).padStart(2, '0').toUpperCase()}` : `#${h}`
}

/** Exact token match for a colour, or null. Used for Before values too. */
export function matchColor(rgba: Rgba, tokens: ColorToken[]): ColorToken | null {
  const exact = tokens.filter((t) => colorDistance(t.rgba, rgba) < 0.002)
  if (!exact.length) return null
  return exact.sort((a, b) => tokenRank(a.name) - tokenRank(b.name))[0]
}

export function snapColor(prop: string, rgba: Rgba, tokens: ColorToken[]): Snap | null {
  if (!tokens.length) return null
  const exact = matchColor(rgba, tokens)
  if (exact) return { token: colorClass(prop, exact.name), value: hex(exact.rgba), exact: true }
  let best = tokens[0]
  let bestD = Infinity
  for (const t of tokens) {
    const d = colorDistance(t.rgba, rgba) + tokenRank(t.name) * 1e-4
    if (d < bestD) {
      best = t
      bestD = d
    }
  }
  return { token: colorClass(prop, best.name), value: hex(best.rgba), exact: false }
}

export function snapValue(
  prop: string,
  value: string,
  ds: DesignSystem,
  parseColor: (v: string) => Rgba | null,
  remPx = 16,
): Snap | null {
  const v = value.trim()
  if (!v) return null
  if (isColorProp(prop)) {
    const rgba = parseColor(v)
    return rgba ? snapColor(prop, rgba, ds.colors) : null
  }
  if (prop === 'font-weight') {
    const n = Number(v)
    return Number.isFinite(n) ? snapLength(prop, n, ds.fontWeights, '') : null
  }
  const px = parsePx(v, remPx)
  if (px === null) return null
  if (prop in SPACING_PREFIX && ds.spacing) return snapSpacing(prop, px, ds.spacing)
  if (prop in SPACING_PREFIX && ds.spaces.length) return snapLength(prop, px, ds.spaces)
  if (RADIUS_PROPS.has(prop)) return snapLength(prop, px, ds.radii)
  if (prop === 'font-size') return snapLength(prop, px, ds.fontSizes)
  return null
}
