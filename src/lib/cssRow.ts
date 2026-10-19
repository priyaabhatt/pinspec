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

/** One row of the handoff image's CSS section. */
export interface HandoffRow {
  prop: string
  before: string
  /** What to implement: a class or token when snapped, else the typed value. */
  after: string
  /** Secondary text: the resolved value, or "exact". */
  afterNote?: string
  /** Swatch colours for colour rows. */
  beforeSwatch?: string
  afterSwatch?: string
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
  /** The row in the handoff image, or null when there's nothing valid to hand off. */
  handoff: HandoffRow | null
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

  let after = typed
  let afterNote: string | undefined
  if (row.exact) afterNote = 'exact'
  else if (snap) {
    after = snap.token
    // Tokens over hex: colour tokens never carry their value.
    if (!color) afterNote = snap.value
  }
  return {
    before,
    hint,
    problem: null,
    preview,
    handoff: {
      prop: row.prop,
      before,
      after,
      afterNote,
      beforeSwatch: color ? (ds.swatch(row.before) ?? undefined) : undefined,
      afterSwatch: color ? (ds.swatch(preview) ?? undefined) : undefined,
    },
  }
}
