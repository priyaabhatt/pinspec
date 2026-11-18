// The pin module: one pin's contents and everything that happens to it
// (select, Remove, edit, Copy, Discard), behind a small interface. The page,
// screenshots and the clipboard are reached through a PinEnvironment, so the
// rules here are unit tested without a browser. See GLOSSARY.md ("Pin",
// "Draft", "Copy", "Discard") and ADR 0006.

import { resolveRow, type CssRow, type ResolvedRow } from './cssRow'
import type { DesignSystem } from './designSystem'

/** `grabbing`: the card is set aside while you select on the page to fill its Before or After. */
export type Stage = 'idle' | 'selecting' | 'capturing' | 'card' | 'grabbing'

export type Slot = 'before' | 'after'

/** Anything the handoff image can draw: a screenshot canvas or a pasted image. */
export type Picture = CanvasImageSource & { width: number; height: number }

/**
 * A box dragged on the page instead of a picked element, in px relative to the
 * box of the element under it. For pages that draw on a canvas (Figma, maps),
 * where there is no element for the part you mean.
 */
export interface Area {
  left: number
  top: number
  width: number
  height: number
}

export interface AfterImage {
  url: string
  img: Picture
}

export interface HandoffInput {
  before: HTMLCanvasElement
  after: Picture | null
  /** Each CSS row as a sentence. */
  changes: string[]
  comment: string
}

/** Everything the pin needs from the outside world. */
export interface PinEnvironment {
  /** Screenshot the element, or just the area of it when given (the live preview shows in it). */
  capture(el: Element, area: Area | null): Promise<HTMLCanvasElement>
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
  /** A screenshot as an After image the card can show. */
  asAfter(shot: HTMLCanvasElement): Promise<AfterImage>
  /** A pasted image as a Before; the pasted image is freed. */
  asBefore(image: AfterImage): HTMLCanvasElement
}

export interface PinState {
  stage: Stage
  element: Element | null
  /** Set when the pin is a dragged box rather than the whole element. CSS rows don't apply to it. */
  area: Area | null
  before: HTMLCanvasElement | null
  comment: string
  after: AfterImage | null
  rows: CssRow[]
  /** Each row resolved against the design system: what the card, preview and image show. */
  resolved: Map<number, ResolvedRow>
  designSystem: DesignSystem | null
  busy: boolean
  /** The slot being filled while grabbing. */
  grabbing: Slot | null
  /** An element and a Before, something to hand off (a comment, an After or a change), and not already copying. */
  canCopy: boolean
}

/** `error` is null when the action was overtaken (Esc, Remove, Discard) and there's nothing to report. */
export type Outcome = { ok: true } | { ok: false; error: string | null }

const EMPTY: PinState = {
  stage: 'idle',
  element: null,
  area: null,
  before: null,
  comment: '',
  after: null,
  rows: [],
  resolved: new Map(),
  designSystem: null,
  busy: false,
  grabbing: null,
  canCopy: false,
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

  /** The pointer button: start selecting, or cancel selecting (keeping the draft), or stop selecting for a slot. */
  toggleSelecting() {
    if (this.state.stage === 'selecting') this.cancelSelecting()
    else if (this.state.stage === 'grabbing') this.cancelGrab()
    else this.removeElement()
  }

  /** Remove: let go of the element and go back to selecting. The draft is kept. */
  removeElement() {
    this.generation++
    this.set({ stage: 'selecting', element: null, area: null, before: null, grabbing: null })
  }

  /** Esc or the pointer button while selecting. The draft waits for the next pick. */
  cancelSelecting() {
    this.generation++
    this.set({ stage: 'idle' })
  }

  /** Pick an element, or a dragged area of the element under it. */
  async pick(el: Element, area: Area | null = null): Promise<Outcome> {
    const generation = ++this.generation
    this.set({ stage: 'capturing' })
    try {
      const before = await this.env.capture(el, area)
      // Overtaken while capturing: leave the pin as it is now.
      if (generation !== this.generation) return { ok: false, error: null }
      const rows = this.state.rows.map((r) => ({ ...r, before: this.env.readValue(el, r.prop) }))
      this.set({ stage: 'card', element: el, area, before, rows, designSystem: this.env.designSystem() })
      return { ok: true }
    } catch (err) {
      if (generation !== this.generation) return { ok: false, error: null }
      this.set({ stage: 'selecting' })
      return { ok: false, error: `Couldn't capture: ${(err as Error).message}` }
    }
  }

  /** Empty the Before; Copy waits until it's filled again. */
  clearBefore() {
    this.set({ before: null })
  }

  /** Fill the Before, e.g. from a pasted image. */
  setBefore(before: HTMLCanvasElement) {
    this.set({ before })
  }

  /** Set the card aside to select on the page for a slot. */
  startGrab(slot: Slot) {
    if (this.state.stage !== 'card') return
    this.generation++
    this.set({ stage: 'grabbing', grabbing: slot })
  }

  /** Esc while grabbing: back to the card, unchanged. */
  cancelGrab() {
    if (this.state.stage !== 'grabbing') return
    this.generation++
    this.set({ stage: 'card', grabbing: null })
  }

  /** Screenshot what was selected into the slot being grabbed for, then back to the card. */
  async grab(el: Element, area: Area | null = null): Promise<Outcome> {
    const slot = this.state.grabbing
    if (this.state.stage !== 'grabbing' || !slot) return { ok: false, error: null }
    const generation = ++this.generation
    try {
      const shot = await this.env.capture(el, area)
      if (generation !== this.generation) return { ok: false, error: null }
      if (slot === 'before') {
        // A new Before is a new subject: the CSS rows and the live preview follow it.
        const rows = this.state.rows.map((r) => ({ ...r, before: this.env.readValue(el, r.prop) }))
        this.set({ stage: 'card', grabbing: null, element: el, area, before: shot, rows, designSystem: this.env.designSystem() })
        return { ok: true }
      }
      const after = await this.env.asAfter(shot)
      if (generation !== this.generation) {
        this.env.release(after)
        return { ok: false, error: null }
      }
      this.setAfter(after)
      this.set({ stage: 'card', grabbing: null })
      return { ok: true }
    } catch (err) {
      if (generation !== this.generation) return { ok: false, error: null }
      this.set({ stage: 'card', grabbing: null })
      return { ok: false, error: `Couldn't capture: ${(err as Error).message}` }
    }
  }

  setComment(comment: string) {
    this.set({ comment })
  }

  /**
   * Paste an image that takes a moment to load into the first empty slot. If
   * the pin moves on meanwhile (Remove, Discard, a new pick), it's freed, not attached.
   */
  async pasteImage(load: () => Promise<AfterImage>): Promise<Outcome> {
    // The first empty slot: Before if it was cleared, else After.
    const slot = this.state.before ? 'after' : 'before'
    const generation = this.generation
    let image: AfterImage
    try {
      image = await load()
    } catch {
      return { ok: false, error: "That image couldn't be read" }
    }
    if (generation !== this.generation || this.state.stage !== 'card') {
      this.env.release(image)
      return { ok: false, error: null }
    }
    if (slot === 'before') this.set({ before: this.env.asBefore(image) })
    else this.setAfter(image)
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
    if (!this.state.canCopy) return { ok: false, error: 'Nothing to copy yet' }
    const s = this.state
    const el = s.element!
    const changes = s.rows.flatMap((r) => s.resolved.get(r.id)?.handoff ?? [])
    const generation = this.generation
    this.set({ busy: true })
    const png = (async () => {
      // No pasted After: the live preview, captured, becomes the After.
      const after = s.after?.img ?? (changes.length ? await this.env.capture(el, s.area) : null)
      return this.env.render({
        before: s.before!,
        after,
        changes,
        comment: s.comment,
      })
    })()
    try {
      await this.env.writeImage(png)
      // Overtaken while copying (Esc, Remove, a new pin): the copy still landed; leave the newer pin be.
      if (generation === this.generation) this.discard()
      else this.set({ busy: false })
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
    if (affectsRows(patch)) next.resolved = resolveAll(next, this.env)
    const handoff = next.comment.trim().length > 0 || !!next.after || [...next.resolved.values()].some((r) => r.handoff)
    next.canCopy = !!next.element && !!next.before && handoff && !next.busy
    this.state = next
    if (affectsRows(patch) || patch.stage) this.syncPreview()
    this.emit()
  }

  /** The live preview shows while the card is open, the element is being captured, or an After is being grabbed. */
  private syncPreview() {
    const s = this.state
    // While grabbing a Before the page shows as it is, so the Before isn't the change.
    const showing = s.stage === 'card' || s.stage === 'capturing' || (s.stage === 'grabbing' && s.grabbing === 'after')
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

/** Rows resolve against the element and design system, so these changes re-resolve them (and the live preview). */
function affectsRows(patch: Partial<PinState>) {
  return !!patch.rows || patch.element !== undefined || patch.area !== undefined || !!patch.designSystem
}

function resolveAll(s: PinState, env: PinEnvironment) {
  // An area has no element of its own to style; its rows wait in the draft.
  if (!s.designSystem || s.area) return new Map<number, ResolvedRow>()
  const classes = s.element ? env.classes(s.element) : []
  return new Map(s.rows.map((r) => [r.id, resolveRow(r, s.designSystem!, classes, env.isValid)]))
}
