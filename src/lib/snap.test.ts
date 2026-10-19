import { describe, expect, it } from 'vitest'
import { createDesignSystem } from './designSystem'
import { tokenKind, type Tokens, type Rgba } from './snap'

const ds: Tokens = {
  spacing: 4,
  spaces: [],
  colors: [
    { name: '--color-gray-500', rgba: [107, 114, 128, 1] },
    { name: '--muted-foreground', rgba: [107, 114, 128, 1] },
    { name: '--color-muted-foreground', rgba: [107, 114, 128, 1] },
    { name: '--color-foreground', rgba: [10, 10, 10, 1] },
  ],
  radii: [
    { name: '--radius-sm', px: 4 },
    { name: '--radius-md', px: 6 },
    { name: '--radius-lg', px: 8 },
  ],
  fontSizes: [{ name: '--text-sm', px: 14 }, { name: '--text-base', px: 16 }],
  fontWeights: [{ name: '--font-weight-medium', px: 500 }, { name: '--font-weight-bold', px: 700 }],
}

const hexColor = (v: string): Rgba | null => {
  const m = v.match(/^#([0-9a-f]{6})$/i)
  if (!m) return null
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1]
}

/** Snapping is tested through the design system's interface, the way callers use it. */
const snap = (tokens: Tokens) => createDesignSystem(tokens, { parseColor: hexColor, remPx: 16 })

describe('snap', () => {
  it('snaps widths to the spacing scale', () => {
    expect(snap(ds).snap('width', '350px')).toEqual({ token: 'w-88', value: '352px', exact: false })
    expect(snap(ds).snap('padding-left', '1rem')).toEqual({ token: 'pl-4', value: '16px', exact: true })
    expect(snap(ds).snap('margin-top', '-8px')?.token).toBe('-mt-2')
  })

  it('snaps radius to the nearest token', () => {
    expect(snap(ds).snap('border-radius', '8px')).toEqual({ token: 'rounded-lg', value: '8px', exact: true })
    expect(snap(ds).snap('border-radius', '7.5px')?.token).toBe('rounded-lg')
  })

  it('prefers semantic colour tokens over palette steps', () => {
    expect(snap(ds).snap('color', '#6B7280')?.token).toBe('text-muted-foreground')
    expect(snap(ds).snap('background-color', '#0B0B0B')).toMatchObject({ token: 'bg-foreground', exact: false })
  })

  it('handles type tokens', () => {
    expect(snap(ds).snap('font-size', '15px')?.token).toMatch(/text-(sm|base)/)
    expect(snap(ds).snap('font-weight', '650')?.token).toBe('font-bold')
  })

  it('returns null with no system', () => {
    const none: Tokens = { spacing: null, spaces: [], colors: [], radii: [], fontSizes: [], fontWeights: [] }
    expect(snap(none).snap('width', '350px')).toBeNull()
    expect(snap(none).snap('color', '#fff000')).toBeNull()
  })
})

describe('tokenKind', () => {
  it('recognises Tailwind and shadcn names', () => {
    expect(tokenKind('--spacing')).toBe('spacing-base')
    expect(tokenKind('--radius-lg')).toBe('radius')
    expect(tokenKind('--radius')).toBe('radius')
    expect(tokenKind('--text-sm')).toBe('font-size')
    expect(tokenKind('--text-sm--line-height')).toBeNull()
    expect(tokenKind('--font-weight-bold')).toBe('font-weight')
    expect(tokenKind('--color-gray-500')).toBe('color')
    expect(tokenKind('--muted-foreground')).toBe('color')
    expect(tokenKind('--tw-ring-color')).toBeNull()
  })

  it('recognises common hand-rolled names', () => {
    for (const n of ['--space-4', '--spacing-md', '--spacer-2', '--gap-lg', '--gutter-sm']) expect(tokenKind(n)).toBe('space')
    for (const n of ['--rounded-sm', '--border-radius-md', '--corner-lg']) expect(tokenKind(n)).toBe('radius')
    for (const n of ['--font-size-lg', '--fs-2', '--type-scale-3']) expect(tokenKind(n)).toBe('font-size')
    for (const n of ['--fw-bold', '--weight-medium']) expect(tokenKind(n)).toBe('font-weight')
    for (const n of ['--shadow-md', '--line-height-tight', '--z-modal', '--font-sans', '--duration-fast']) expect(tokenKind(n)).toBeNull()
  })
})

describe('snap on a non-Tailwind site', () => {
  const custom: Tokens = {
    spacing: null,
    spaces: [
      { name: '--space-2', px: 8 },
      { name: '--space-4', px: 16 },
      { name: '--space-6', px: 24 },
    ],
    colors: [{ name: '--brand-primary', rgba: [37, 99, 235, 1] }],
    radii: [
      { name: '--rounded-sm', px: 4 },
      { name: '--rounded-md', px: 8 },
    ],
    fontSizes: [{ name: '--font-size-body', px: 16 }],
    fontWeights: [{ name: '--fw-bold', px: 700 }],
  }

  it('snaps to the custom scale and uses var()', () => {
    expect(snap(custom).snap('padding-left', '18px')).toEqual({ token: 'var(--space-4)', value: '16px', exact: false })
    expect(snap(custom).snap('gap', '24px')).toEqual({ token: 'var(--space-6)', value: '24px', exact: true })
    expect(snap(custom).snap('border-radius', '7px')?.token).toBe('var(--rounded-md)')
    expect(snap(custom).snap('font-size', '15px')?.token).toBe('var(--font-size-body)')
    expect(snap(custom).snap('font-weight', '700')?.token).toBe('var(--fw-bold)')
    expect(snap(custom).snap('color', '#2563EB')).toMatchObject({ token: 'var(--brand-primary)', exact: true })
  })

  it('prefers the Tailwind name when an alias has the same value', () => {
    const tw: Tokens = { ...ds, radii: [{ name: '--radius', px: 8 }, { name: '--radius-lg', px: 8 }] }
    expect(snap(tw).snap('border-radius', '8px')?.token).toBe('rounded-lg')
  })
})
