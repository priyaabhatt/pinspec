// The CSS row module: a CSS row resolved once into everything that shows it,
// so the live preview, the card and the handoff image can't disagree. See
// GLOSSARY.md ("CSS row", "Live preview", "Exact").

import type { DesignSystem } from './designSystem'
import { isColorProp } from './snap'

export interface CssRow {
  id: number
  prop: string
  /** The value on the page, as computed. */
  before: string
  /** The value the designer typed. */
  after: string
  /** Keep the typed value instead of snapping to the design system. */
  exact: boolean
}

export interface ResolvedRow {
  /** The before value as the card, picker and image write it. */
  before: string
  /** The snap suggestion under the card's input; struck through when the row is exact. */
  hint: { text: string; struck: boolean } | null
  /** Shown in the card when the typed value isn't valid CSS for the property. */
  problem: string | null
  /** The value applied to the page while typing, or null. */
  preview: string | null
  /**
   * The row as a sentence for the handoff image ("Change the width from 232px
   * to w-88 (352px), the nearest step to 350px."), or null when there's
   * nothing valid to hand off.
   */
  handoff: string | null
}

/**
 * Resolve a CSS row against the pin's design system. `classes` are the
 * element's class names (for naming the before value) and `isValid` checks a
 * value is CSS the property accepts (CSS.supports in the browser).
 */
export function resolveRow(
  row: CssRow,
  ds: DesignSystem,
  classes: string[],
  isValid: (prop: string, value: string) => boolean,
): ResolvedRow {
  const before = ds.nameBefore(row.prop, row.before, classes)
  const typed = row.after.trim()
  if (!typed) return { before, hint: null, problem: null, preview: null, handoff: null }
  if (!isValid(row.prop, typed)) {
    return { before, hint: null, problem: `Not a valid ${row.prop}`, preview: null, handoff: null }
  }

  const snap = ds.snap(row.prop, typed)
  const color = isColorProp(row.prop)
  // The live preview shows what the agent will be told to build.
  const preview = snap && !row.exact ? snap.value : typed
  const hint = snap ? { text: snap.exact ? snap.token : `${snap.token} (${snap.value})`, struck: row.exact } : null

  // The page's value, named as the code most likely writes it, with the raw
  // value alongside when the name hides it.
  const raw = color ? ds.swatch(row.before) : row.before
  const from = raw && raw !== before ? `${before} (${raw})` : before
  let to = typed
  if (row.exact) to = `exactly ${typed}`
  else if (snap) {
    const value = color ? ds.swatch(snap.value) ?? snap.value : snap.value
    to = `${snap.token} (${value})`
    if (!snap.exact) to += `, the nearest ${color ? 'token' : 'step'} to ${typed}`
  }
  return {
    before,
    hint,
    problem: null,
    preview,
    handoff: `Change the ${propName(row.prop)} from ${from} to ${to}.`,
  }
}

/** A property as words: color → text colour, background-color → background colour, font-style → font style. */
function propName(prop: string) {
  if (prop === 'color') return 'text colour'
  return prop.replace(/-color$/, ' colour').replace(/-/g, ' ')
}
