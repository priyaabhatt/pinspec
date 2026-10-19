import { describe, expect, it } from 'vitest'
import { snapValue, type DesignSystem, type Rgba } from './snap'

const ds: DesignSystem = {
  spacing: 4,
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
    const none: DesignSystem = { spacing: null, colors: [], radii: [], fontSizes: [], fontWeights: [] }
    expect(snapValue('width', '350px', none, hexColor)).toBeNull()
    expect(snapValue('color', '#fff000', none, hexColor)).toBeNull()
  })
})
