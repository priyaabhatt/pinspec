import { describe, expect, it } from 'vitest'
import { resolveRow, type CssRow } from './cssRow'
import { createDesignSystem } from './designSystem'
import type { Rgba, Tokens } from './snap'

const parseColor = (v: string): Rgba | null => {
  const m = v.match(/^#([0-9a-f]{6})$/i)
  if (!m) return null
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1]
}

const tokens: Tokens = {
  spacing: 4,
  spaces: [],
  colors: [
    { name: '--color-muted-foreground', rgba: [107, 114, 128, 1] },
    { name: '--color-background', rgba: [255, 255, 255, 1] },
  ],
  radii: [{ name: '--radius-lg', px: 8 }],
  fontSizes: [],
  fontWeights: [],
}
const ds = createDesignSystem(tokens, { parseColor, remPx: 16 })

/** Stand-in for CSS.supports: lengths in px, or hex colours. */
const isValid = (prop: string, value: string) =>
  prop === 'color' || prop === 'background-color' ? /^#[0-9a-f]{6}$/i.test(value) : /^-?\d+(\.\d+)?px$/.test(value)

const row = (patch: Partial<CssRow>): CssRow => ({ id: 1, prop: 'width', before: '232px', after: '', exact: false, ...patch })
const resolve = (patch: Partial<CssRow>, classes: string[] = []) => resolveRow(row(patch), ds, classes, isValid)

describe('a snapped row', () => {
  const r = resolve({ after: '350px' })

  it('previews the snapped value, so the page shows what the agent will build', () => {
    expect(r.preview).toBe('352px')
  })

  it('hints the snap in the card', () => {
    expect(r.hint).toEqual({ text: 'w-88 (352px)', struck: false })
  })

  it('hands off the class with its value as a note', () => {
    expect(r.handoff).toMatchObject({ prop: 'width', before: '232px', after: 'w-88', afterNote: '352px' })
  })
})

describe('an exact row', () => {
  const r = resolve({ after: '350px', exact: true })

  it('previews what was typed', () => {
    expect(r.preview).toBe('350px')
  })

  it('still shows the snap it opts out of, struck through', () => {
    expect(r.hint).toEqual({ text: 'w-88 (352px)', struck: true })
  })

  it('hands off the typed value marked exact', () => {
    expect(r.handoff).toMatchObject({ after: '350px', afterNote: 'exact' })
  })
})

describe('a colour row', () => {
  const r = resolve({ prop: 'color', before: '#FFFFFF', after: '#6b7280' })

  it('names both sides by token, with no hex note, and gives swatches', () => {
    expect(r.handoff).toEqual({
      prop: 'color',
      before: 'text-background',
      after: 'text-muted-foreground',
      afterNote: undefined,
      beforeSwatch: '#FFFFFF',
      afterSwatch: '#6B7280',
    })
    expect(r.hint).toEqual({ text: 'text-muted-foreground', struck: false })
  })
})

describe('a row with a typo', () => {
  const r = resolve({ after: '350pz' })

  it('flags it in the card and keeps it out of the preview and the image', () => {
    expect(r.problem).toBe('Not a valid width')
    expect(r.preview).toBeNull()
    expect(r.handoff).toBeNull()
    expect(r.hint).toBeNull()
  })
})

describe('an empty row', () => {
  it('shows only its before value', () => {
    expect(resolve({}, ['w-58'])).toEqual({ before: 'w-58', hint: null, problem: null, preview: null, handoff: null })
  })
})

describe('a row with no token to snap to', () => {
  it('previews and hands off the typed value', () => {
    const none = resolveRow(row({ after: '350px' }), createDesignSystem({ ...tokens, spacing: null }, { parseColor, remPx: 16 }), [], isValid)
    expect(none.preview).toBe('350px')
    expect(none.hint).toBeNull()
    expect(none.handoff).toMatchObject({ after: '350px', afterNote: undefined })
  })
})
