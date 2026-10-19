import { describe, expect, it } from 'vitest'
import { createDesignSystem } from './designSystem'
import type { Rgba, Tokens } from './snap'

const parseColor = (v: string): Rgba | null => {
  const m = v.match(/^#([0-9a-f]{6})$/i)
  if (!m) return null
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1]
}
const page = { parseColor, remPx: 16 }

const tailwind: Tokens = {
  spacing: 4,
  spaces: [],
  colors: [
    { name: '--color-gray-500', rgba: [107, 114, 128, 1] },
    { name: '--color-muted-foreground', rgba: [107, 114, 128, 1] },
    { name: '--muted-foreground', rgba: [107, 114, 128, 1] },
    { name: '--color-background', rgba: [255, 255, 255, 1] },
  ],
  radii: [
    { name: '--radius', px: 8 },
    { name: '--radius-sm', px: 4 },
    { name: '--radius-lg', px: 8 },
  ],
  fontSizes: [{ name: '--text-sm', px: 14 }],
  fontWeights: [{ name: '--font-weight-medium', px: 500 }],
}

const custom: Tokens = {
  spacing: null,
  spaces: [{ name: '--space-4', px: 16 }],
  colors: [{ name: '--ink', rgba: [17, 24, 39, 1] }],
  radii: [{ name: '--rounded-md', px: 8 }],
  fontSizes: [],
  fontWeights: [],
}

const tw = createDesignSystem(tailwind, page)
const site = createDesignSystem(custom, page)

describe('one naming rule for every place a token is written', () => {
  it('writes Tailwind tokens as classes', () => {
    expect(tw.snap('width', '350px')?.token).toBe('w-88')
    expect(tw.snap('border-radius', '8px')?.token).toBe('rounded-lg')
    expect(tw.snap('color', '#6B7280')?.token).toBe('text-muted-foreground')
    expect(tw.nameBefore('color', '#FFFFFF', [])).toBe('text-background')
    expect(tw.nameBefore('background-color', '#FFFFFF', [])).toBe('bg-background')
  })

  it('writes other sites’ tokens as var()', () => {
    expect(site.snap('padding-left', '18px')?.token).toBe('var(--space-4)')
    expect(site.nameBefore('color', '#111827', [])).toBe('var(--ink)')
  })
})

describe('before values: colours', () => {
  it('uses the element’s own colour class when several tokens share the hex', () => {
    expect(tw.nameBefore('color', '#6B7280', ['text-gray-500', 'p-4'])).toBe('text-gray-500')
    expect(tw.nameBefore('color', '#6B7280', ['md:text-muted-foreground'])).toBe('md:text-muted-foreground')
  })

  it('falls back to the best-matching token, then to hex', () => {
    expect(tw.nameBefore('color', '#6B7280', [])).toBe('text-muted-foreground')
    expect(tw.nameBefore('color', '#123456', [])).toBe('#123456')
  })

  it('ignores a colour class whose token is a different colour', () => {
    expect(tw.nameBefore('color', '#6B7280', ['text-background'])).toBe('text-muted-foreground')
  })
})

describe('before values: lengths', () => {
  it('shows a class only when the element has it', () => {
    expect(tw.nameBefore('width', '232px', ['w-58'])).toBe('w-58')
    expect(tw.nameBefore('width', '232px', ['flex'])).toBe('232px')
  })

  it('keeps arbitrary values raw', () => {
    expect(tw.nameBefore('width', '232px', ['w-[232px]'])).toBe('232px')
  })

  it('keeps breakpoint prefixes and ignores state variants', () => {
    expect(tw.nameBefore('width', '232px', ['w-40', 'md:w-58'])).toBe('md:w-58')
    expect(tw.nameBefore('width', '232px', ['hover:w-58'])).toBe('232px')
  })

  it('finds the class that sets a side through a shorthand utility', () => {
    expect(tw.nameBefore('padding-left', '16px', ['px-4', 'py-2'])).toBe('px-4')
    expect(tw.nameBefore('padding-top', '8px', ['px-4', 'py-2'])).toBe('py-2')
    expect(tw.nameBefore('margin-top', '-8px', ['-mt-2'])).toBe('-mt-2')
  })

  it('names radius, font size and weight from their utilities', () => {
    expect(tw.nameBefore('border-radius', '8px', ['rounded-lg'])).toBe('rounded-lg')
    expect(tw.nameBefore('font-size', '14px', ['text-sm', 'text-gray-500'])).toBe('text-sm')
    expect(tw.nameBefore('font-weight', '500', ['font-medium'])).toBe('font-medium')
  })

  it('shows lengths raw on sites without utility classes', () => {
    expect(site.nameBefore('padding-left', '16px', ['cta'])).toBe('16px')
  })
})

describe('swatch and found', () => {
  it('gives hex for colours only', () => {
    expect(tw.swatch('#6b7280')).toBe('#6B7280')
    expect(tw.swatch('12px')).toBeNull()
  })

  it('reports whether the page has tokens', () => {
    expect(tw.found).toBe(true)
    expect(createDesignSystem({ spacing: null, spaces: [], colors: [], radii: [], fontSizes: [], fontWeights: [] }, page).found).toBe(false)
  })
})

describe('snapping after values', () => {
  const scale = createDesignSystem(
    {
      ...tailwind,
      colors: [...tailwind.colors, { name: '--color-foreground', rgba: [10, 10, 10, 1] }],
      radii: [
        { name: '--radius-sm', px: 4 },
        { name: '--radius-md', px: 6 },
        { name: '--radius-lg', px: 8 },
      ],
      fontSizes: [
        { name: '--text-sm', px: 14 },
        { name: '--text-base', px: 16 },
      ],
      fontWeights: [
        { name: '--font-weight-medium', px: 500 },
        { name: '--font-weight-bold', px: 700 },
      ],
    },
    page,
  )
  const handRolled = createDesignSystem(
    {
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
    },
    page,
  )

  it('snaps lengths to the spacing scale, including rem and negatives', () => {
    expect(scale.snap('width', '350px')).toEqual({ token: 'w-88', value: '352px', exact: false })
    expect(scale.snap('padding-left', '1rem')).toEqual({ token: 'pl-4', value: '16px', exact: true })
    expect(scale.snap('margin-top', '-8px')?.token).toBe('-mt-2')
  })

  it('snaps radius, font size and weight to the nearest token', () => {
    expect(scale.snap('border-radius', '8px')).toEqual({ token: 'rounded-lg', value: '8px', exact: true })
    expect(scale.snap('border-radius', '7.5px')?.token).toBe('rounded-lg')
    expect(scale.snap('font-size', '15px')?.token).toMatch(/text-(sm|base)/)
    expect(scale.snap('font-weight', '650')?.token).toBe('font-bold')
  })

  it('snaps colours to the nearest token, semantic names first', () => {
    expect(scale.snap('background-color', '#0B0B0B')).toMatchObject({ token: 'bg-foreground', exact: false })
  })

  it('prefers the Tailwind name when an alias has the same value', () => {
    expect(tw.snap('border-radius', '8px')?.token).toBe('rounded-lg')
  })

  it('snaps to a hand-rolled scale and writes var()', () => {
    expect(handRolled.snap('gap', '24px')).toEqual({ token: 'var(--space-6)', value: '24px', exact: true })
    expect(handRolled.snap('border-radius', '7px')?.token).toBe('var(--rounded-md)')
    expect(handRolled.snap('font-size', '15px')?.token).toBe('var(--font-size-body)')
    expect(handRolled.snap('font-weight', '700')?.token).toBe('var(--fw-bold)')
    expect(handRolled.snap('color', '#2563EB')).toMatchObject({ token: 'var(--brand-primary)', exact: true })
  })

  it('snaps nothing when the page has no tokens', () => {
    const none = createDesignSystem({ spacing: null, spaces: [], colors: [], radii: [], fontSizes: [], fontWeights: [] }, page)
    expect(none.snap('width', '350px')).toBeNull()
    expect(none.snap('color', '#fff000')).toBeNull()
  })
})
