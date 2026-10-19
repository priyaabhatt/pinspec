import { describe, expect, it } from 'vitest'
import { footer, tidy } from './footer'

const base = { hasSystem: true, hasRows: true, hasExact: false, hasPastedAfter: false }

describe('footer', () => {
  it('scopes the change to the Before element on every copy', () => {
    for (const ctx of [base, { ...base, hasRows: false }, { ...base, hasPastedAfter: true }]) {
      expect(footer(ctx)[0]).toMatch(/^Change only the element shown in Before/)
    }
  })

  it('describes where the target comes from', () => {
    expect(footer(base)[0]).toContain('applying the CSS rows')
    expect(footer({ ...base, hasPastedAfter: true })[0]).toContain('take precedence over the image')
    expect(footer({ ...base, hasRows: false })[0]).toContain('described in the comment')
  })

  it('adds notes only when they apply', () => {
    expect(footer(base)).toHaveLength(2)
    expect(footer({ ...base, hasSystem: false }).at(-1)).toContain('No design tokens were found')
    expect(footer({ ...base, hasSystem: false, hasRows: false })).toHaveLength(2)
    expect(footer({ ...base, hasExact: true }).at(-1)).toContain('exact must use the value as given')
  })
})

describe('tidy', () => {
  it('trims, collapses spaces and capitalises', () => {
    expect(tidy('  make   it\twider  ')).toBe('Make it wider')
    expect(tidy('a\n\n\n\nb')).toBe('A\n\nb')
  })
})
