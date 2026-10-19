import { describe, expect, it } from 'vitest'
import { createDesignSystem } from './designSystem'
import { Pin, type AfterImage, type HandoffInput, type PinEnvironment } from './pin'
import type { Rgba } from './snap'

/** A recording fake of the outside world: no browser needed. */
function fakeEnvironment(opts: { clipboardFails?: boolean } = {}) {
  const log = {
    previews: [] as { el: Element | null; values: Record<string, string> }[],
    captures: 0,
    rendered: [] as HandoffInput[],
    released: [] as string[],
  }
  const parseColor = (): Rgba | null => null
  const ds = createDesignSystem({ spacing: 4, spaces: [], colors: [], radii: [], fontSizes: [], fontWeights: [] }, { parseColor, remPx: 16 })
  const shot = { width: 10, height: 10 } as unknown as HTMLCanvasElement
  const env: PinEnvironment = {
    capture: async () => {
      log.captures++
      return shot
    },
    designSystem: () => ds,
    // Fake elements carry their width; every property reads as that, which is all these tests need.
    readValue: (el) => `${(el as unknown as { width: number }).width}px`,
    classes: () => [],
    isValid: (_prop, value) => /^\d+px$/.test(value),
    preview: (el, values) => log.previews.push({ el, values: Object.fromEntries(values) }),
    render: async (input) => {
      log.rendered.push(input)
      return new Blob(['png'])
    },
    writeImage: async (png) => {
      await png
      if (opts.clipboardFails) throw new Error('blocked')
    },
    release: (after) => log.released.push(after.url),
  }
  return { env, log }
}

const element = (width: number) => ({ width }) as unknown as Element
const after = (url: string): AfterImage => ({ url, img: { width: 1, height: 1 } as unknown as HTMLCanvasElement })

async function pinWithElement(opts?: { clipboardFails?: boolean }) {
  const { env, log } = fakeEnvironment(opts)
  const pin = new Pin(env, 'selecting')
  await pin.pick(element(232))
  return { pin, log }
}

describe('selecting', () => {
  it('opens the card with a Before screenshot and the design system', async () => {
    const { pin } = await pinWithElement()
    expect(pin.get().stage).toBe('card')
    expect(pin.get().before).not.toBeNull()
    expect(pin.get().designSystem?.found).toBe(true)
  })

  it('re-reads the CSS rows’ before values for a newly picked element', async () => {
    const { pin } = await pinWithElement()
    const id = pin.addRow('width')
    expect(pin.get().rows[0].before).toBe('232px')
    pin.removeElement()
    await pin.pick(element(300))
    expect(pin.get().rows.find((r) => r.id === id)?.before).toBe('300px')
  })

  it('goes back to selecting with an error when the screenshot fails', async () => {
    const { env } = fakeEnvironment()
    const pin = new Pin({ ...env, capture: async () => Promise.reject(new Error('no tab')) }, 'selecting')
    expect(await pin.pick(element(1))).toEqual({ ok: false, error: "Couldn't capture: no tab" })
    expect(pin.get().stage).toBe('selecting')
  })
})

describe('the draft', () => {
  it('survives Remove: comment, After and CSS rows are kept, the element and page are let go', async () => {
    const { pin, log } = await pinWithElement()
    pin.setComment('wider')
    pin.setAfter(after('blob:a'))
    pin.addRow('width')
    pin.removeElement()
    const s = pin.get()
    expect(s.stage).toBe('selecting')
    expect(s.element).toBeNull()
    expect(s.comment).toBe('wider')
    expect(s.after?.url).toBe('blob:a')
    expect(s.rows).toHaveLength(1)
    expect(log.previews.at(-1)).toEqual({ el: null, values: {} })
  })

  it('survives cancelling selection, by Esc or the pointer button', async () => {
    const { pin } = await pinWithElement()
    pin.setComment('wider')
    pin.removeElement()
    pin.cancelSelecting()
    expect(pin.get()).toMatchObject({ stage: 'idle', comment: 'wider' })
    pin.toggleSelecting()
    expect(pin.get().stage).toBe('selecting')
    pin.toggleSelecting()
    expect(pin.get()).toMatchObject({ stage: 'idle', comment: 'wider' })
  })
})

describe('live preview', () => {
  it('applies valid after values to the element and restores the page on discard', async () => {
    const { pin, log } = await pinWithElement()
    const id = pin.addRow('width')
    pin.updateRow(id, { after: '350px' })
    expect(log.previews.at(-1)?.values).toEqual({ width: '352px' })
    pin.updateRow(id, { after: '350pz' })
    expect(log.previews.at(-1)?.values).toEqual({})
    pin.discard()
    expect(log.previews.at(-1)).toEqual({ el: null, values: {} })
  })
})

describe('copy', () => {
  it('needs an element and a comment', async () => {
    const { pin } = await pinWithElement()
    expect(pin.canCopy).toBe(false)
    pin.setComment('wider')
    expect(pin.canCopy).toBe(true)
    pin.removeElement()
    expect(pin.canCopy).toBe(false)
  })

  it('renders the handoff, ends the pin and restores the page on success', async () => {
    const { pin, log } = await pinWithElement()
    pin.setComment('wider')
    pin.updateRow(pin.addRow('width'), { after: '350px' })
    expect(await pin.copy()).toEqual({ ok: true })
    expect(log.rendered[0]).toMatchObject({ afterSource: 'live preview', comment: 'wider', hasSystem: true })
    expect(log.rendered[0].rows).toEqual([expect.objectContaining({ prop: 'width', after: 'w-88' })])
    expect(pin.get()).toMatchObject({ stage: 'idle', element: null, comment: '', rows: [] })
    expect(log.previews.at(-1)).toEqual({ el: null, values: {} })
  })

  it('uses a pasted After instead of capturing the live preview', async () => {
    const { pin, log } = await pinWithElement()
    pin.setComment('wider')
    pin.setAfter(after('blob:b'))
    const captures = log.captures
    await pin.copy()
    expect(log.captures).toBe(captures)
    expect(log.rendered[0].afterSource).toBe('pasted')
    expect(log.released).toEqual(['blob:b'])
  })

  it('keeps the pin when the clipboard refuses', async () => {
    const { pin } = await pinWithElement({ clipboardFails: true })
    pin.setComment('wider')
    expect(await pin.copy()).toEqual({ ok: false, error: "Couldn't copy: blocked" })
    expect(pin.get()).toMatchObject({ stage: 'card', comment: 'wider', busy: false })
  })
})

describe('discard', () => {
  it('ends the pin and frees the pasted After', async () => {
    const { pin, log } = await pinWithElement()
    pin.setComment('wider')
    pin.setAfter(after('blob:c'))
    pin.discard()
    expect(pin.get()).toMatchObject({ stage: 'idle', comment: '', after: null, element: null })
    expect(log.released).toEqual(['blob:c'])
  })

  it('frees a replaced After right away', async () => {
    const { pin, log } = await pinWithElement()
    pin.setAfter(after('blob:1'))
    pin.setAfter(after('blob:2'))
    expect(log.released).toEqual(['blob:1'])
  })
})

describe('a capture that is overtaken', () => {
  /** A pin whose capture waits until `finish()`, or fails with `fail()`. */
  function slowPin() {
    const { env, log } = fakeEnvironment()
    let finish!: () => void
    let fail!: () => void
    const shot = { width: 1, height: 1 } as unknown as HTMLCanvasElement
    const slow: PinEnvironment = {
      ...env,
      capture: () =>
        new Promise((resolve, reject) => {
          finish = () => resolve(shot)
          fail = () => reject(new Error('no tab'))
        }),
    }
    return { pin: new Pin(slow, 'selecting'), log, finish: () => finish(), fail: () => fail() }
  }

  it('stays discarded when Discard happens mid-capture', async () => {
    const { pin, finish } = slowPin()
    const picking = pin.pick(element(232))
    pin.discard()
    finish()
    expect(await picking).toEqual({ ok: false, error: null })
    expect(pin.get()).toMatchObject({ stage: 'idle', element: null })
  })

  it('stays cancelled, keeping the draft, when Esc happens mid-capture', async () => {
    const { pin, finish } = slowPin()
    pin.setComment('keep me')
    const picking = pin.pick(element(232))
    pin.cancelSelecting()
    finish()
    await picking
    expect(pin.get()).toMatchObject({ stage: 'idle', element: null, comment: 'keep me' })
  })

  it('stays in selecting when Remove happens mid-capture', async () => {
    const { pin, finish } = slowPin()
    const picking = pin.pick(element(232))
    pin.removeElement()
    finish()
    await picking
    expect(pin.get()).toMatchObject({ stage: 'selecting', element: null })
  })

  it('reports nothing when it fails after being overtaken', async () => {
    const { pin, fail } = slowPin()
    const picking = pin.pick(element(232))
    pin.cancelSelecting()
    fail()
    expect(await picking).toEqual({ ok: false, error: null })
    expect(pin.get().stage).toBe('idle')
  })
})

describe('pasting an After that takes a moment to load', () => {
  const slowLoad = () => {
    let finish!: (a: AfterImage) => void
    const load = () => new Promise<AfterImage>((r) => (finish = r))
    return { load, finish: (a: AfterImage) => finish(a) }
  }

  it('attaches it when the card is still open', async () => {
    const { pin } = await pinWithElement()
    const { load, finish } = slowLoad()
    const pasting = pin.pasteAfter(load)
    finish(after('blob:ok'))
    expect(await pasting).toEqual({ ok: true })
    expect(pin.get().after?.url).toBe('blob:ok')
  })

  it('frees it when the pin was discarded meanwhile, even after a new pick', async () => {
    const { pin, log } = await pinWithElement()
    const { load, finish } = slowLoad()
    const pasting = pin.pasteAfter(load)
    pin.discard()
    await pin.pick(element(100))
    finish(after('blob:late'))
    expect(await pasting).toEqual({ ok: false, error: null })
    expect(pin.get().after).toBeNull()
    expect(log.released).toContain('blob:late')
  })

  it('reports an image that can’t be read', async () => {
    const { pin } = await pinWithElement()
    expect(await pin.pasteAfter(() => Promise.reject(new Error('bad')))).toEqual({ ok: false, error: "That image couldn't be read" })
  })
})
