import { describe, expect, it } from 'vitest'
import { tokenKind } from './snap'

// Snapping itself is tested through the design system's interface, in
// designSystem.test.ts. tokenKind stays here: the page reader (tokens.ts)
// calls it directly.

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
