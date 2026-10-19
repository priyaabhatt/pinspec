import { describe, expect, it } from 'vitest'
import { footer, tidy } from './footer'

const base = { hasSystem: true, hasChanges: true, hasExact: false, hasPastedAfter: false }

describe('footer', () => {
  it('scopes the change to the Before element whenever there is an After', () => {
    for (const ctx of [base, { ...base, hasChanges: false, hasPastedAfter: true }]) {
      expect(footer(ctx)[0]).toMatch(/^Change only the element shown in Before/)
    }
  })

  it('points at the only picture when there is no After', () => {
    expect(footer({ ...base, hasChanges: false })[0]).toMatch(/^Change only the element shown above/)
  })

  it('describes where the target comes from', () => {
    expect(footer(base)[0]).toContain('Make the changes listed')
    expect(footer({ ...base, hasPastedAfter: true })[0]).toContain('take precedence over the image')
    expect(footer({ ...base, hasChanges: false })[0]).toContain('described in the comment')
  })

  it('adds notes only when they apply', () => {
    expect(footer(base)).toHaveLength(2)
    expect(footer({ ...base, hasSystem: false }).at(-1)).toContain('No design tokens were found')
    expect(footer({ ...base, hasSystem: false, hasChanges: false })).toHaveLength(2)
    expect(footer({ ...base, hasExact: true }).at(-1)).toContain('must be used as given')
  })
})

describe('tidy', () => {
  it('trims, collapses spaces and capitalises', () => {
    expect(tidy('  make   it\twider  ')).toBe('Make it wider')
    expect(tidy('a\n\n\n\nb')).toBe('A\n\nb')
  })
})
