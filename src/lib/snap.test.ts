import { describe, expect, it } from 'vitest'
import { snapValue, tokenKind, type DesignSystem, type Rgba } from './snap'

const ds: DesignSystem = {
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

describe('snapValue', () => {
  it('snaps widths to the spacing scale', () => {
    expect(snapValue('width', '350px', ds, hexColor)).toEqual({ token: 'w-88', value: '352px', exact: false })
    expect(snapValue('padding-left', '1rem', ds, hexColor)).toEqual({ token: 'pl-4', value: '16px', exact: true })
    expect(snapValue('margin-top', '-8px', ds, hexColor)?.token).toBe('-mt-2')
  })

  it('snaps radius to the nearest token', () => {
    expect(snapValue('border-radius', '8px', ds, hexColor)).toEqual({ token: 'rounded-lg', value: '8px', exact: true })
    expect(snapValue('border-radius', '7.5px', ds, hexColor)?.token).toBe('rounded-lg')
  })

  it('prefers semantic colour tokens over palette steps', () => {
    expect(snapValue('color', '#6B7280', ds, hexColor)?.token).toBe('text-muted-foreground')
    expect(snapValue('background-color', '#0B0B0B', ds, hexColor)).toMatchObject({ token: 'bg-foreground', exact: false })
  })

  it('handles type tokens', () => {
    expect(snapValue('font-size', '15px', ds, hexColor)?.token).toMatch(/text-(sm|base)/)
    expect(snapValue('font-weight', '650', ds, hexColor)?.token).toBe('font-bold')
  })

  it('returns null with no system', () => {
    const none: DesignSystem = { spacing: null, spaces: [], colors: [], radii: [], fontSizes: [], fontWeights: [] }
    expect(snapValue('width', '350px', none, hexColor)).toBeNull()
    expect(snapValue('color', '#fff000', none, hexColor)).toBeNull()
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

describe('snapValue on a non-Tailwind site', () => {
  const custom: DesignSystem = {
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
    expect(snapValue('padding-left', '18px', custom, hexColor)).toEqual({ token: 'var(--space-4)', value: '16px', exact: false })
    expect(snapValue('gap', '24px', custom, hexColor)).toEqual({ token: 'var(--space-6)', value: '24px', exact: true })
    expect(snapValue('border-radius', '7px', custom, hexColor)?.token).toBe('var(--rounded-md)')
    expect(snapValue('font-size', '15px', custom, hexColor)?.token).toBe('var(--font-size-body)')
    expect(snapValue('font-weight', '700', custom, hexColor)?.token).toBe('var(--fw-bold)')
    expect(snapValue('color', '#2563EB', custom, hexColor)).toMatchObject({ token: 'var(--brand-primary)', exact: true })
  })

  it('prefers the Tailwind name when an alias has the same value', () => {
    const tw: DesignSystem = { ...ds, radii: [{ name: '--radius', px: 8 }, { name: '--radius-lg', px: 8 }] }
    expect(snapValue('border-radius', '8px', tw, hexColor)?.token).toBe('rounded-lg')
  })
})
