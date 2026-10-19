// Applies typed after values to the page as inline !important styles, and
// puts the element back exactly as it was when the pin ends.

export class LivePreview {
  private el: HTMLElement | SVGElement | null = null
  private originals = new Map<string, { value: string; priority: string }>()

  /** Make the element's live overrides match `values` exactly. */
  sync(el: Element | null, values: Map<string, string>) {
    if (el !== this.el) {
      this.restoreAll()
      this.el = el instanceof HTMLElement || el instanceof SVGElement ? el : null
    }
    const target = this.el
    if (!target) return
    for (const prop of Array.from(this.originals.keys())) {
      if (!values.has(prop)) this.restore(prop)
    }
    for (const [prop, value] of values) {
      if (!this.originals.has(prop)) {
        this.originals.set(prop, {
          value: target.style.getPropertyValue(prop),
          priority: target.style.getPropertyPriority(prop),
        })
      }
      target.style.setProperty(prop, value, 'important')
    }
  }

  private restore(prop: string) {
    const o = this.originals.get(prop)
    if (!o || !this.el) return
    if (o.value) this.el.style.setProperty(prop, o.value, o.priority)
    else this.el.style.removeProperty(prop)
    this.originals.delete(prop)
  }

  restoreAll() {
    for (const prop of Array.from(this.originals.keys())) this.restore(prop)
    if (this.el && !this.el.getAttribute('style')) this.el.removeAttribute('style')
    this.originals.clear()
    this.el = null
  }
}
