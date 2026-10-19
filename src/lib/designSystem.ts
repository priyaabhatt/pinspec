// The design system module: everything pinspec knows about a page's tokens,
// behind one small interface. Callers snap after values, name before values
// and get swatches; how tokens are read, how colours are parsed and how
// names are written all stay in here. See GLOSSARY.md ("Design system") and
// ADR 0005.

import { COLOR_PREFIX, colorClass, hasSystem, hex, isColorProp, isTailwind, matchColor, parsePx, snapValue, type Rgba, type Snap, type Tokens } from './snap'

export interface DesignSystem {
  /** The page exposes any tokens at all. */
  readonly found: boolean
  /** Snap a typed after value to the nearest token or scale step. */
  snap(prop: string, value: string): Snap | null
  /**
   * Write a before value the way the code most likely writes it: the
   * element's own utility class or an exactly matching colour token, else the
   * value as it is.
   */
  nameBefore(prop: string, value: string, classes: string[]): string
  /** A colour value as hex, for swatches; null for anything that isn't a colour. */
  swatch(value: string): string | null
}

/** What the module needs from the page, handed in so tests can fake it. */
export interface PageReader {
  parseColor(value: string): Rgba | null
  /** The page's root font size in px. */
  remPx: number
}

export function createDesignSystem(tokens: Tokens, page: PageReader): DesignSystem {
  return {
    found: hasSystem(tokens),
    snap: (prop, value) => (value.trim() ? snapValue(prop, value, tokens, page.parseColor, page.remPx) : null),
    nameBefore: (prop, value, classes) =>
      isColorProp(prop) ? nameColor(prop, value, classes, tokens, page) : (lengthClassFor(prop, value, classes, tokens, page) ?? value),
    swatch: (value) => {
      const rgba = page.parseColor(value)
      return rgba ? hex(rgba) : null
    },
  }
}

// --- before values ------------------------------------------------------

function nameColor(prop: string, value: string, classes: string[], tokens: Tokens, page: PageReader) {
  const rgba = page.parseColor(value)
  if (!rgba) return value
  // The element's own colour class settles which of several equal tokens it
  // uses; an arbitrary colour class (text-[#6b7280]) is a custom value.
  const prefix = COLOR_PREFIX[prop]
  for (const { cls, utility } of activeUtilities(classes)) {
    if (!prefix || !utility.startsWith(prefix + '-')) continue
    if (utility.startsWith(prefix + '-[')) return hex(rgba)
    const token = tokens.colors.find((t) => t.name === `--color-${utility.slice(prefix.length + 1)}`)
    if (token && matchColor(rgba, [token])) return cls
  }
  const match = matchColor(rgba, tokens.colors)
  return match ? colorClass(prop, match.name, isTailwind(tokens)) : hex(rgba)
}

/** Utility prefixes that set each length property, most specific first. */
const LENGTH_UTILITIES: Record<string, string[]> = {
  width: ['w', 'size'],
  height: ['h', 'size'],
  'min-width': ['min-w'],
  'min-height': ['min-h'],
  'max-width': ['max-w'],
  'max-height': ['max-h'],
  padding: ['p'],
  'padding-top': ['pt', 'py', 'p'],
  'padding-bottom': ['pb', 'py', 'p'],
  'padding-left': ['pl', 'px', 'p'],
  'padding-right': ['pr', 'px', 'p'],
  margin: ['m'],
  'margin-top': ['mt', 'my', 'm'],
  'margin-bottom': ['mb', 'my', 'm'],
  'margin-left': ['ml', 'mx', 'm'],
  'margin-right': ['mr', 'mx', 'm'],
  gap: ['gap'],
  'row-gap': ['gap-y', 'gap'],
  'column-gap': ['gap-x', 'gap'],
  top: ['top', 'inset-y', 'inset'],
  bottom: ['bottom', 'inset-y', 'inset'],
  left: ['left', 'inset-x', 'inset'],
  right: ['right', 'inset-x', 'inset'],
  'border-radius': ['rounded'],
  'border-top-left-radius': ['rounded-tl', 'rounded-t', 'rounded-l', 'rounded'],
  'border-top-right-radius': ['rounded-tr', 'rounded-t', 'rounded-r', 'rounded'],
  'border-bottom-left-radius': ['rounded-bl', 'rounded-b', 'rounded-l', 'rounded'],
  'border-bottom-right-radius': ['rounded-br', 'rounded-b', 'rounded-r', 'rounded'],
  'font-size': ['text'],
  'font-weight': ['font'],
}

/**
 * A length gets a name only when the element really has the class that
 * produces it: `232px` is `w-58` only if `w-58` is in its class list.
 * Arbitrary values (`w-[232px]`) are custom, so they stay raw.
 */
function lengthClassFor(prop: string, value: string, classes: string[], tokens: Tokens, page: PageReader): string | null {
  const prefixes = LENGTH_UTILITIES[prop]
  // Utility classes only mean something on a Tailwind site.
  if (!prefixes || !isTailwind(tokens)) return null
  const target = prop === 'font-weight' ? Number(value) : parsePx(value, page.remPx)
  if (target === null || !Number.isFinite(target)) return null
  const active = activeUtilities(classes)
  for (const prefix of prefixes) {
    for (const { cls, utility } of active) {
      const px = utilityValue(utility, prefix, tokens)
      if (px !== null && Math.abs(px - target) < 0.5) return cls
    }
  }
  return null
}

/** The value a utility like `w-58`, `-mt-2`, `rounded-lg` or `text-sm` sets, or null. */
function utilityValue(utility: string, prefix: string, tokens: Tokens): number | null {
  const negative = utility.startsWith('-')
  const u = negative ? utility.slice(1) : utility
  if (!u.startsWith(prefix + '-')) return null
  const rest = u.slice(prefix.length + 1)
  if (rest.startsWith('[')) return null
  if (prefix.startsWith('rounded')) return tokens.radii.find((t) => t.name === `--radius-${rest}`)?.px ?? null
  if (prefix === 'text') return tokens.fontSizes.find((t) => t.name === `--text-${rest}`)?.px ?? null
  if (prefix === 'font') return tokens.fontWeights.find((t) => t.name === `--font-weight-${rest}`)?.px ?? null
  if (tokens.spacing === null) return null
  const steps = rest === 'px' ? 1 / tokens.spacing : Number(rest)
  if (!Number.isFinite(steps)) return null
  return (negative ? -1 : 1) * steps * tokens.spacing
}

/**
 * Breakpoint and dark: variants can be what's on screen, so they're kept (the
 * value check decides); state variants (hover:, focus:) don't apply now.
 */
const STATE_VARIANT = /^(hover|focus|focus-visible|focus-within|active|visited|disabled|enabled|checked|open|placeholder|group-.+|peer-.+|aria-.+|data-.+|first|last|odd|even|before|after|selection|marker|file|print|motion-.+)$/

/**
 * Classes split into their utility, without state variants or `!` markers,
 * unprefixed classes first so `w-58` wins over `dark:w-58` when both match.
 */
function activeUtilities(classes: string[]) {
  const out: { cls: string; utility: string; variants: number }[] = []
  for (const cls of classes) {
    const parts = cls.split(':')
    const utility = parts.pop()!.replace(/^!|!$/g, '')
    if (parts.some((v) => STATE_VARIANT.test(v))) continue
    out.push({ cls, utility, variants: parts.length })
  }
  return out.sort((a, b) => a.variants - b.variants)
}
