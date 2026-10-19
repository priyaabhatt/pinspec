// The pin module: one pin's contents and everything that happens to it
// (select, Remove, edit, Copy, Discard), behind a small interface. The page,
// screenshots and the clipboard are reached through a PinEnvironment, so the
// rules here are unit tested without a browser. See GLOSSARY.md ("Pin",
// "Draft", "Copy", "Discard") and ADR 0006.

import { resolveRow, type CssRow, type HandoffRow, type ResolvedRow } from './cssRow'
import type { DesignSystem } from './designSystem'

export type Stage = 'idle' | 'selecting' | 'capturing' | 'card'

export interface AfterImage {
  url: string
  img: CanvasImageSource & { width: number; height: number }
}

type Shot = CanvasImageSource & { width: number; height: number }

export interface HandoffInput {
  before: Shot
  after: Shot | null
  /** Where the After came from: pasted, the live preview, or nothing. */
  afterSource: 'pasted' | 'live preview' | 'none'
  element: Element
  rows: HandoffRow[]
  comment: string
  hasSystem: boolean
  hasExact: boolean
}

/** Everything the pin needs from the outside world. */
export interface PinEnvironment {
  /** Screenshot the element (the live preview shows in it). */
  capture(el: Element): Promise<Shot>
  /** Read the page's design system for a newly selected element. */
  designSystem(): DesignSystem
  /** The element's current value for a CSS property. */
  readValue(el: Element, prop: string): string
  classes(el: Element): string[]
  isValid(prop: string, value: string): boolean
  /** Make the element's live preview match `values`; a null element restores the page. */
  preview(el: Element | null, values: Map<string, string>): void
  /** Draw the handoff image. */
  render(input: HandoffInput): Promise<Blob>
  /** Put the image on the clipboard. Called synchronously from Copy so the click still counts. */
  writeImage(png: Promise<Blob>): Promise<void>
  /** Free a pasted After image. */
  release(after: AfterImage): void
}

export interface PinState {
  stage: Stage
  element: Element | null
  before: Shot | null
  comment: string
  after: AfterImage | null
  rows: CssRow[]
  /** Each row resolved against the design system: what the card, preview and image show. */
  resolved: Map<number, ResolvedRow>
  designSystem: DesignSystem | null
  busy: boolean
}

/** `error` is null when the action was overtaken (Esc, Remove, Discard) and there's nothing to report. */
export type Outcome = { ok: true } | { ok: false; error: string | null }

const EMPTY: PinState = {
  stage: 'idle',
  element: null,
  before: null,
  comment: '',
  after: null,
  rows: [],
  resolved: new Map(),
  designSystem: null,
  busy: false,
}

export class Pin {
  private state: PinState
  private listeners = new Set<() => void>()
  private nextId = 1
  /**
   * Bumped by every pick, Remove, cancel and Discard, so a slow capture or
   * image load can tell it was overtaken.
   */
  private generation = 0

  constructor(
    private env: PinEnvironment,
    stage: Stage = 'idle',
  ) {
    this.state = { ...EMPTY, stage }
  }

  get = () => this.state

  subscribe = (fn: () => void) => {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  get canCopy() {
    const s = this.state
    return !!s.element && !!s.before && s.comment.trim().length > 0 && !s.busy
  }

  /** The pointer button: start selecting, or cancel selecting (keeping the draft). */
  toggleSelecting() {
    if (this.state.stage === 'selecting') this.cancelSelecting()
    else this.removeElement()
  }

  /** Remove: let go of the element and go back to selecting. The draft is kept. */
  removeElement() {
    this.generation++
    this.set({ stage: 'selecting', element: null, before: null })
  }

  /** Esc or the pointer button while selecting. The draft waits for the next pick. */
  cancelSelecting() {
    this.generation++
    this.set({ stage: 'idle' })
  }

  async pick(el: Element): Promise<Outcome> {
    const generation = ++this.generation
    this.set({ stage: 'capturing' })
    try {
      const before = await this.env.capture(el)
      // Overtaken while capturing: leave the pin as it is now.
      if (generation !== this.generation) return { ok: false, error: null }
      const rows = this.state.rows.map((r) => ({ ...r, before: this.env.readValue(el, r.prop) }))
      this.set({ stage: 'card', element: el, before, rows, designSystem: this.env.designSystem() })
      return { ok: true }
    } catch (err) {
      if (generation !== this.generation) return { ok: false, error: null }
      this.set({ stage: 'selecting' })
      return { ok: false, error: `Couldn't capture: ${(err as Error).message}` }
    }
  }

  setComment(comment: string) {
    this.set({ comment })
  }

  /**
   * Paste an After image that takes a moment to load. If the pin moves on
   * meanwhile (Remove, Discard, a new pick), the image is freed, not attached.
   */
  async pasteAfter(load: () => Promise<AfterImage>): Promise<Outcome> {
    const generation = this.generation
    let after: AfterImage
    try {
      after = await load()
    } catch {
      return { ok: false, error: "That image couldn't be read" }
    }
    if (generation !== this.generation || this.state.stage !== 'card') {
      this.env.release(after)
      return { ok: false, error: null }
    }
    this.setAfter(after)
    return { ok: true }
  }

  setAfter(after: AfterImage | null) {
    if (this.state.after && this.state.after !== after) this.env.release(this.state.after)
    this.set({ after })
  }

  /** Add a CSS row for a property; returns its id. */
  addRow(prop: string): number {
    const id = this.nextId++
    const el = this.state.element
    const before = el ? this.env.readValue(el, prop) : ''
    this.set({ rows: [...this.state.rows, { id, prop, before, after: '', exact: false }] })
    return id
  }

  updateRow(id: number, patch: Partial<Pick<CssRow, 'after' | 'exact'>>) {
    this.set({ rows: this.state.rows.map((r) => (r.id === id ? { ...r, ...patch } : r)) })
  }

  removeRow(id: number) {
    this.set({ rows: this.state.rows.filter((r) => r.id !== id) })
  }

  /**
   * Compose the handoff image and put it on the clipboard. On success the pin
   * ends; on failure it's kept so nothing is lost.
   */
  async copy(): Promise<Outcome> {
    if (!this.canCopy) return { ok: false, error: 'Nothing to copy yet' }
    const s = this.state
    const el = s.element!
    const rows = s.rows.flatMap((r) => s.resolved.get(r.id)?.handoff ?? [])
    this.set({ busy: true })
    const png = (async () => {
      // No pasted After: the live preview, captured, becomes the After.
      const after = s.after?.img ?? (rows.length ? await this.env.capture(el) : null)
      return this.env.render({
        before: s.before!,
        after,
        afterSource: s.after ? 'pasted' : rows.length ? 'live preview' : 'none',
        element: el,
        rows,
        comment: s.comment,
        hasSystem: !!s.designSystem?.found,
        hasExact: s.rows.some((r) => r.exact && s.resolved.get(r.id)?.handoff),
      })
    })()
    try {
      await this.env.writeImage(png)
      this.discard()
      return { ok: true }
    } catch (err) {
      this.set({ busy: false })
      return { ok: false, error: `Couldn't copy: ${(err as Error)?.message ?? err}` }
    }
  }

  /** ✕, or Esc while the card is open: end the pin and put the page back. */
  discard() {
    this.generation++
    if (this.state.after) this.env.release(this.state.after)
    this.state = { ...EMPTY, resolved: new Map() }
    this.env.preview(null, new Map())
    this.emit()
  }

  private set(patch: Partial<PinState>) {
    const next = { ...this.state, ...patch }
    // Rows are re-resolved whenever they, the element or the design system change.
    if (patch.rows || patch.element !== undefined || patch.designSystem) {
      next.resolved = resolveAll(next, this.env)
    }
    this.state = next
    this.syncPreview()
    this.emit()
  }

  /** The live preview shows while the card is open or the element is being captured. */
  private syncPreview() {
    const s = this.state
    const showing = s.stage === 'card' || s.stage === 'capturing'
    const values = new Map<string, string>()
    if (showing && s.element) {
      for (const r of s.rows) {
        const preview = s.resolved.get(r.id)?.preview
        if (preview) values.set(r.prop, preview)
      }
    }
    this.env.preview(showing ? s.element : null, values)
  }

  private emit() {
    for (const fn of this.listeners) fn()
  }
}

function resolveAll(s: PinState, env: PinEnvironment) {
  if (!s.designSystem) return new Map<number, ResolvedRow>()
  const classes = s.element ? env.classes(s.element) : []
  return new Map(s.rows.map((r) => [r.id, resolveRow(r, s.designSystem!, classes, env.isValid)]))
}
