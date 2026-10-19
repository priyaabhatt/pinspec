import { describe, expect, it } from 'vitest'
import { tidy } from './comment'

describe('tidy', () => {
  it('trims, collapses spaces and capitalises', () => {
    expect(tidy('  make   it\twider  ')).toBe('Make it wider')
    expect(tidy('a\n\n\n\nb')).toBe('A\n\nb')
  })
})
